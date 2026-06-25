import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const FETCH_TIMEOUT_MS = 15000

interface FetchRssRequest {
  url?: string
}

interface FetchRssSuccessResponse {
  success: true
  xml: string
  status: number
}

interface FetchRssErrorResponse {
  success: false
  error: string
  status?: number
}

function jsonResponse(body: FetchRssSuccessResponse | FetchRssErrorResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405)
  }

  try {
    const body = (await req.json()) as FetchRssRequest
    const url = body.url?.trim()

    if (!url) {
      return jsonResponse({ success: false, error: 'Invalid URL' })
    }

    if (!isValidHttpUrl(url)) {
      return jsonResponse({ success: false, error: 'Invalid URL' })
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/rss+xml, application/xml, text/xml, */*',
          'User-Agent': 'MX-Intelligence-RSS-Fetcher/1.0',
        },
      })

      const xml = await response.text()

      if (!response.ok) {
        return jsonResponse({
          success: false,
          error: 'Feed returned non-200 status',
          status: response.status,
        })
      }

      if (!xml.trim()) {
        return jsonResponse({
          success: false,
          error: 'Empty feed',
          status: response.status,
        })
      }

      return jsonResponse({
        success: true,
        xml,
        status: response.status,
      })
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return jsonResponse({ success: false, error: 'Failed to fetch feed' })
    }

    return jsonResponse({ success: false, error: 'Failed to fetch feed' })
  }
})
