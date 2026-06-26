import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'

const FETCH_TIMEOUT_MS = 15000
const CONNECTOR_IDS = ['newsapi', 'reddit', 'google_news', 'hacker_news', 'rss'] as const

type ConnectorId = typeof CONNECTOR_IDS[number]

interface TestConnectorRequest {
  connectorId?: string
}

interface TestResult {
  connected: boolean
  latency: number
  quotaRemaining?: number | string | null
  status: 'healthy' | 'failed'
  error?: string
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

async function getSecret(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  provider: string,
): Promise<string | null> {
  const { data } = await adminClient
    .from('user_api_keys')
    .select('secret')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle()

  return data?.secret ?? null
}

async function recordTestRun(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  connectorId: ConnectorId,
  result: TestResult,
): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await adminClient.from('connector_sync_history').insert({
    user_id: userId,
    connector_id: connectorId,
    source_id: null,
    started_at: now,
    finished_at: now,
    duration_ms: result.latency,
    status: result.connected ? 'success' : 'failed',
    articles_downloaded: 0,
    articles_imported: 0,
    duplicates: 0,
    errors: result.connected ? 0 : 1,
    updated_count: 0,
    remaining_quota:
      result.quotaRemaining !== undefined && result.quotaRemaining !== null
        ? String(result.quotaRemaining)
        : null,
    error_message: result.error ?? null,
  })

  if (error) {
    // History table may not exist yet — test response still succeeds.
    console.warn('connector_sync_history insert skipped:', error.message)
  }
}

async function testNewsApi(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
): Promise<TestResult> {
  const startedAt = performance.now()
  const apiKey = await getSecret(adminClient, userId, 'newsapi')

  if (!apiKey) {
    return {
      connected: false,
      latency: Math.round(performance.now() - startedAt),
      status: 'failed',
      error: 'API key not configured',
    }
  }

  try {
    const response = await fetchWithTimeout(
      `https://newsapi.org/v2/top-headlines?country=us&pageSize=1&apiKey=${encodeURIComponent(apiKey)}`,
    )
    const payload = await response.json()
    const latency = Math.round(performance.now() - startedAt)

    if (!response.ok) {
      return {
        connected: false,
        latency,
        status: 'failed',
        error: typeof payload?.message === 'string' ? payload.message : 'NewsAPI request failed',
      }
    }

    return {
      connected: true,
      latency,
      status: 'healthy',
      quotaRemaining: null,
    }
  } catch (error) {
    const latency = Math.round(performance.now() - startedAt)
    if (error instanceof Error && error.name === 'AbortError') {
      return { connected: false, latency, status: 'failed', error: 'Network timeout' }
    }
    return { connected: false, latency, status: 'failed', error: 'Network error' }
  }
}

async function testReddit(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
): Promise<TestResult> {
  const startedAt = performance.now()
  const clientId = await getSecret(adminClient, userId, 'reddit_client_id')
  const clientSecret = await getSecret(adminClient, userId, 'reddit_client_secret')
  const refreshToken = await getSecret(adminClient, userId, 'reddit_refresh_token')

  try {
    if (clientId && clientSecret && refreshToken) {
      const credentials = btoa(`${clientId}:${clientSecret}`)
      const response = await fetchWithTimeout('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'MX-Intelligence/1.0',
        },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
      })

      const payload = await response.json()
      const latency = Math.round(performance.now() - startedAt)

      if (!response.ok) {
        return {
          connected: false,
          latency,
          status: 'failed',
          error: typeof payload?.error === 'string' ? payload.error : 'Reddit authentication failed',
        }
      }

      return { connected: true, latency, status: 'healthy' }
    }

    const response = await fetchWithTimeout('https://www.reddit.com/r/worldnews/hot.json?limit=1', {
      headers: {
        'User-Agent': 'MX-Intelligence/1.0',
        Accept: 'application/json',
      },
    })

    const latency = Math.round(performance.now() - startedAt)
    if (!response.ok) {
      return {
        connected: false,
        latency,
        status: 'failed',
        error: `Reddit request failed (${response.status})`,
      }
    }

    return { connected: true, latency, status: 'healthy' }
  } catch (error) {
    const latency = Math.round(performance.now() - startedAt)
    if (error instanceof Error && error.name === 'AbortError') {
      return { connected: false, latency, status: 'failed', error: 'Network timeout' }
    }
    return { connected: false, latency, status: 'failed', error: 'Network error' }
  }
}

async function testGoogleNews(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
): Promise<TestResult> {
  const startedAt = performance.now()

  try {
    const { data: sources } = await adminClient
      .from('sources')
      .select('connector_config, url')
      .eq('user_id', userId)
      .ilike('source_type', 'google news')

    const source = sources?.[0]
    const config = (source?.connector_config as Record<string, unknown>) ?? {}
    const language = String(config.language ?? 'en-US')
    const country = String(config.region ?? config.country ?? 'US')
    const query = String(config.query ?? source?.url ?? 'technology')

    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${language}&gl=${country}&ceid=${country}:en`
    const response = await fetchWithTimeout(url, {
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
        'User-Agent': 'MX-Intelligence-GoogleNews-Test/1.0',
      },
    })

    const latency = Math.round(performance.now() - startedAt)

    if (!response.ok) {
      return {
        connected: false,
        latency,
        status: 'failed',
        error: `Google News feed returned ${response.status}`,
      }
    }

    const xml = await response.text()
    if (!xml.trim()) {
      return { connected: false, latency, status: 'failed', error: 'Empty feed response' }
    }

    return { connected: true, latency, status: 'healthy' }
  } catch (error) {
    const latency = Math.round(performance.now() - startedAt)
    if (error instanceof Error && error.name === 'AbortError') {
      return { connected: false, latency, status: 'failed', error: 'Network timeout' }
    }
    return { connected: false, latency, status: 'failed', error: 'Network error' }
  }
}

async function testHackerNews(): Promise<TestResult> {
  const startedAt = performance.now()

  try {
    const response = await fetchWithTimeout(
      'https://hacker-news.firebaseio.com/v0/topstories.json',
    )
    const latency = Math.round(performance.now() - startedAt)

    if (!response.ok) {
      return {
        connected: false,
        latency,
        status: 'failed',
        error: `Hacker News request failed (${response.status})`,
      }
    }

    const ids = await response.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return { connected: false, latency, status: 'failed', error: 'No stories returned' }
    }

    return { connected: true, latency, status: 'healthy' }
  } catch (error) {
    const latency = Math.round(performance.now() - startedAt)
    if (error instanceof Error && error.name === 'AbortError') {
      return { connected: false, latency, status: 'failed', error: 'Network timeout' }
    }
    return { connected: false, latency, status: 'failed', error: 'Network error' }
  }
}

async function testRss(): Promise<TestResult> {
  const startedAt = performance.now()
  const testUrl = 'https://feeds.bbci.co.uk/news/rss.xml'

  try {
    const response = await fetchWithTimeout(testUrl, {
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
        'User-Agent': 'MX-Intelligence-RSS-Test/1.0',
      },
    })

    const latency = Math.round(performance.now() - startedAt)

    if (!response.ok) {
      return {
        connected: false,
        latency,
        status: 'failed',
        error: `RSS feed returned ${response.status}`,
      }
    }

    const xml = await response.text()
    if (!xml.trim()) {
      return { connected: false, latency, status: 'failed', error: 'Empty feed' }
    }

    return { connected: true, latency, status: 'healthy' }
  } catch (error) {
    const latency = Math.round(performance.now() - startedAt)
    if (error instanceof Error && error.name === 'AbortError') {
      return { connected: false, latency, status: 'failed', error: 'Network timeout' }
    }
    return { connected: false, latency, status: 'failed', error: 'Network error' }
  }
}

serve(async (req: Request) => {
  const corsResponse = handleCorsPreflight(req)
  if (corsResponse) {
    return corsResponse
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, connected: false, status: 'failed', error: 'Method not allowed' }, 405)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({
        success: false,
        connected: false,
        status: 'failed',
        error: 'Unauthorized',
      }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) {
      return jsonResponse({
        success: false,
        connected: false,
        status: 'failed',
        error: 'Unauthorized',
      }, 401)
    }

    const userId = userData.user.id
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const body = (await req.json()) as TestConnectorRequest
    const connectorId = body.connectorId?.trim() as ConnectorId

    if (!connectorId || !CONNECTOR_IDS.includes(connectorId)) {
      return jsonResponse({
        success: false,
        connected: false,
        status: 'failed',
        error: 'Invalid connector',
      })
    }

    let result: TestResult

    switch (connectorId) {
      case 'newsapi':
        result = await testNewsApi(adminClient, userId)
        break
      case 'reddit':
        result = await testReddit(adminClient, userId)
        break
      case 'google_news':
        result = await testGoogleNews(adminClient, userId)
        break
      case 'hacker_news':
        result = await testHackerNews()
        break
      case 'rss':
        result = await testRss()
        break
      default:
        return jsonResponse({
          success: false,
          connected: false,
          status: 'failed',
          error: 'Invalid connector',
        })
    }

    await recordTestRun(adminClient, userId, connectorId, result)

    if (result.connected) {
      return jsonResponse({
        success: true,
        connected: true,
        latency: result.latency,
        quotaRemaining: result.quotaRemaining ?? null,
        status: 'healthy',
      })
    }

    return jsonResponse({
      success: false,
      connected: false,
      latency: result.latency,
      error: result.error ?? 'Connection test failed',
      status: 'failed',
    })
  } catch {
    return jsonResponse({
      success: false,
      connected: false,
      status: 'failed',
      error: 'Unknown error',
    })
  }
})
