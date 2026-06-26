import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'

const PROVIDERS = [
  'newsapi',
  'reddit_client_id',
  'reddit_client_secret',
  'reddit_refresh_token',
] as const

interface ManageApiKeyRequest {
  action?: string
  provider?: string
  secret?: string
}

async function getUserClients(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return null
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) {
    return null
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  return { userId: userData.user.id, adminClient }
}

async function getLatestTestFromHistory(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  connectorId: string,
) {
  const { data } = await adminClient
    .from('connector_sync_history')
    .select('started_at, finished_at, status, error_message')
    .eq('user_id', userId)
    .eq('connector_id', connectorId)
    .is('source_id', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data
}

serve(async (req: Request) => {
  const corsResponse = handleCorsPreflight(req)
  if (corsResponse) {
    return corsResponse
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405)
  }

  try {
    const clients = await getUserClients(req)
    if (!clients) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401)
    }

    const { userId, adminClient } = clients
    const body = (await req.json()) as ManageApiKeyRequest
    const action = body.action ?? 'status'

    if (action === 'status') {
      const { data: rows, error } = await adminClient
        .from('user_api_keys')
        .select('provider, updated_at')
        .eq('user_id', userId)

      if (error) {
        return jsonResponse({ success: false, error: 'Failed to load API key status' })
      }

      const configured = new Set((rows ?? []).map((row) => row.provider as string))
      const statuses = PROVIDERS.map((provider) => ({
        provider,
        configured: configured.has(provider),
      }))

      const newsapiTest = await getLatestTestFromHistory(adminClient, userId, 'newsapi')
      const redditTest = await getLatestTestFromHistory(adminClient, userId, 'reddit')

      const newsapiConfigured = configured.has('newsapi')
      const redditConfigured =
        configured.has('reddit_client_id') &&
        configured.has('reddit_client_secret') &&
        configured.has('reddit_refresh_token')

      return jsonResponse({
        success: true,
        statuses,
        metadata: {
          newsapi: {
            lastTestedAt: newsapiTest?.finished_at ?? newsapiTest?.started_at ?? null,
            lastTestStatus: newsapiTest?.status === 'success' ? 'healthy' : newsapiTest ? 'failed' : null,
            lastTestError: newsapiTest?.error_message ?? null,
            connected: newsapiTest?.status === 'success' || newsapiConfigured,
          },
          reddit: {
            lastTestedAt: redditTest?.finished_at ?? redditTest?.started_at ?? null,
            lastTestStatus: redditTest?.status === 'success' ? 'healthy' : redditTest ? 'failed' : null,
            lastTestError: redditTest?.error_message ?? null,
            connected: redditTest?.status === 'success' || redditConfigured,
          },
        },
      })
    }

    const provider = body.provider?.trim()
    if (!provider || !PROVIDERS.includes(provider as typeof PROVIDERS[number])) {
      return jsonResponse({ success: false, error: 'Invalid provider' })
    }

    if (action === 'delete') {
      const { error } = await adminClient
        .from('user_api_keys')
        .delete()
        .eq('user_id', userId)
        .eq('provider', provider)

      if (error) {
        return jsonResponse({ success: false, error: 'Failed to delete API key' })
      }

      return jsonResponse({ success: true })
    }

    if (action === 'save') {
      const secret = body.secret?.trim()
      if (!secret) {
        return jsonResponse({ success: false, error: 'API key cannot be empty' })
      }

      const { error } = await adminClient.from('user_api_keys').upsert(
        {
          user_id: userId,
          provider,
          secret,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,provider' },
      )

      if (error) {
        return jsonResponse({ success: false, error: 'Failed to save API key' })
      }

      return jsonResponse({ success: true })
    }

    return jsonResponse({ success: false, error: 'Invalid action' })
  } catch {
    return jsonResponse({ success: false, error: 'Internal server error' })
  }
})
