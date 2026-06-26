import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'

const FETCH_TIMEOUT_MS = 15000

interface FetchRedditRequest {
  subreddit?: string
  sort?: string
  query?: string
  limit?: number
}

interface RedditPost {
  title: string
  selftext: string
  author: string
  score: number
  num_comments: number
  url: string
  permalink: string
  created_utc: number
  thumbnail?: string
  subreddit?: string
}

function mapPost(child: Record<string, unknown>): RedditPost | null {
  const data = child.data as Record<string, unknown> | undefined
  if (!data) return null

  const title = String(data.title ?? '').trim()
  if (!title) return null

  const permalink = String(data.permalink ?? '')
  const url = String(data.url ?? permalink)
  const selftext = String(data.selftext ?? '')
  const author = String(data.author ?? 'unknown')
  const score = Number(data.score ?? 0)
  const num_comments = Number(data.num_comments ?? 0)
  const created_utc = Number(data.created_utc ?? 0)
  const thumbnail = typeof data.thumbnail === 'string' ? data.thumbnail : undefined
  const subreddit = typeof data.subreddit === 'string' ? data.subreddit : undefined

  return {
    title,
    selftext,
    author,
    score,
    num_comments,
    url,
    permalink,
    created_utc,
    thumbnail,
    subreddit,
  }
}

async function getRedditAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<string | null> {
  const credentials = btoa(`${clientId}:${clientSecret}`)
  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'MX-Intelligence-Reddit-Fetcher/1.0',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) return null
  const payload = await response.json()
  return typeof payload?.access_token === 'string' ? payload.access_token : null
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
    let accessToken: string | null = null

    if (authHeader) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: userData } = await userClient.auth.getUser()

      if (userData.user) {
        const adminClient = createClient(supabaseUrl, serviceRoleKey)
        const [clientIdRow, secretRow, tokenRow] = await Promise.all([
          adminClient.from('user_api_keys').select('secret').eq('user_id', userData.user.id).eq('provider', 'reddit_client_id').maybeSingle(),
          adminClient.from('user_api_keys').select('secret').eq('user_id', userData.user.id).eq('provider', 'reddit_client_secret').maybeSingle(),
          adminClient.from('user_api_keys').select('secret').eq('user_id', userData.user.id).eq('provider', 'reddit_refresh_token').maybeSingle(),
        ])

        if (clientIdRow.data?.secret && secretRow.data?.secret && tokenRow.data?.secret) {
          accessToken = await getRedditAccessToken(
            clientIdRow.data.secret,
            secretRow.data.secret,
            tokenRow.data.secret,
          )
        }
      }
    }

    const body = (await req.json()) as FetchRedditRequest
    const subreddit = body.subreddit?.trim().replace(/^r\//i, '') || 'worldnews'
    const sort = body.sort?.trim().toLowerCase() || 'hot'
    const limit = Math.min(Math.max(body.limit ?? 25, 1), 100)
    const query = body.query?.trim()
    const startedAt = performance.now()

    let url: string
    const base = accessToken ? 'https://oauth.reddit.com' : 'https://www.reddit.com'

    if (sort === 'search' && query) {
      url = `${base}/search.json?q=${encodeURIComponent(query)}&limit=${limit}`
    } else if (sort === 'rising') {
      url = `${base}/r/${encodeURIComponent(subreddit)}/rising.json?limit=${limit}`
    } else if (sort === 'new' || sort === 'top' || sort === 'hot') {
      url = `${base}/r/${encodeURIComponent(subreddit)}/${sort}.json?limit=${limit}`
    } else {
      url = `${base}/r/${encodeURIComponent(subreddit)}/hot.json?limit=${limit}`
    }

    const headers: Record<string, string> = {
      'User-Agent': 'MX-Intelligence-Reddit-Fetcher/1.0',
      Accept: 'application/json',
    }
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
      const response = await fetch(url, { signal: controller.signal, headers })
      const durationMs = Math.round(performance.now() - startedAt)

      if (!response.ok) {
        return jsonResponse({
          success: false,
          error: `Reddit request failed (${response.status})`,
          httpStatus: response.status,
          durationMs,
          authenticated: Boolean(accessToken),
        })
      }

      const payload = await response.json()
      const children = payload?.data?.children as Record<string, unknown>[] | undefined
      const posts = (children ?? [])
        .map((child) => mapPost(child))
        .filter((post): post is RedditPost => post !== null)

      if (posts.length === 0) {
        return jsonResponse({
          success: false,
          error: 'No Reddit posts found',
          httpStatus: response.status,
          durationMs,
        })
      }

      return jsonResponse({
        success: true,
        posts,
        durationMs,
        httpStatus: response.status,
        authenticated: Boolean(accessToken),
      })
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return jsonResponse({ success: false, error: 'Reddit request timed out' })
    }

    return jsonResponse({ success: false, error: 'Failed to fetch Reddit posts' })
  }
})
