import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'

const FETCH_TIMEOUT_MS = 15000

interface FetchNewsApiRequest {
  mode?: string
  country?: string
  category?: string
  language?: string
  query?: string
  fromDate?: string
  toDate?: string
  pageSize?: number
  page?: number
  sortBy?: string
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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: keyRow, error: keyError } = await adminClient
      .from('user_api_keys')
      .select('secret')
      .eq('user_id', userData.user.id)
      .eq('provider', 'newsapi')
      .maybeSingle()

    if (keyError || !keyRow?.secret) {
      return jsonResponse({
        success: false,
        error: 'NewsAPI key not configured. Add your key in Settings → API Keys.',
      })
    }

    const body = (await req.json()) as FetchNewsApiRequest
    const mode = body.mode === 'everything' ? 'everything' : 'top-headlines'
    const pageSize = Math.min(Math.max(body.pageSize ?? 25, 1), 100)
    const page = Math.max(body.page ?? 1, 1)
    const params = new URLSearchParams({
      apiKey: keyRow.secret,
      pageSize: String(pageSize),
      page: String(page),
    })

    if (body.country) params.set('country', body.country)
    if (body.category) params.set('category', body.category)
    if (body.language) params.set('language', body.language)
    if (body.query) params.set('q', body.query)
    if (body.fromDate) params.set('from', body.fromDate)
    if (body.toDate) params.set('to', body.toDate)
    if (body.sortBy && mode === 'everything') params.set('sortBy', body.sortBy)

    const endpoint =
      mode === 'everything'
        ? `https://newsapi.org/v2/everything?${params.toString()}`
        : `https://newsapi.org/v2/top-headlines?${params.toString()}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const startedAt = performance.now()

    try {
      const response = await fetch(endpoint, { signal: controller.signal })
      const payload = await response.json()
      const durationMs = Math.round(performance.now() - startedAt)

      if (!response.ok) {
        const message =
          typeof payload?.message === 'string'
            ? payload.message
            : 'NewsAPI request failed'
        return jsonResponse({
          success: false,
          error: message,
          httpStatus: response.status,
          durationMs,
        })
      }

      const articles = Array.isArray(payload?.articles) ? payload.articles : []
      const totalResults = Number(payload?.totalResults ?? articles.length)
      const remainingQuota =
        typeof payload?.message === 'string' && payload.message.includes('rate')
          ? payload.message
          : null

      return jsonResponse({
        success: true,
        articles,
        totalResults,
        page,
        pageSize,
        durationMs,
        httpStatus: response.status,
        remainingQuota,
      })
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return jsonResponse({ success: false, error: 'NewsAPI request timed out' })
    }

    return jsonResponse({ success: false, error: 'Failed to fetch NewsAPI articles' })
  }
})
