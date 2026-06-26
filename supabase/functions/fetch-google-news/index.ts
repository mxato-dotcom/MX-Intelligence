import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'

const FETCH_TIMEOUT_MS = 15000

interface FetchGoogleNewsRequest {
  query?: string
  language?: string
  country?: string
  timePeriod?: string
  maxArticles?: number
  topic?: string
}

interface GoogleNewsItem {
  title: string
  url: string
  summary: string
  published_at: string
  source_name: string
}

function buildRssUrl(body: FetchGoogleNewsRequest): string {
  const language = body.language?.trim() || 'en-US'
  const region = body.country?.trim() || 'US'
  const query = body.query?.trim()
  const topic = body.topic?.trim()
  const timePeriod = body.timePeriod?.trim()

  let searchQuery = query ?? ''
  if (timePeriod === '1d') {
    searchQuery = `${searchQuery} when:1d`.trim()
  } else if (timePeriod === '7d') {
    searchQuery = `${searchQuery} when:7d`.trim()
  }

  if (topic) {
    return `https://news.google.com/rss/topics/${encodeURIComponent(topic)}?hl=${language}&gl=${region}&ceid=${region}:en`
  }

  if (!searchQuery) {
    return `https://news.google.com/rss?hl=${language}&gl=${region}&ceid=${region}:en`
  }

  return `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=${language}&gl=${region}&ceid=${region}:en`
}

function textValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim()
  if (typeof value === 'object' && value !== null && '#text' in value) {
    return String((value as { '#text': unknown })['#text']).trim()
  }
  return ''
}

function parseRssItems(xml: string, maxArticles: number): GoogleNewsItem[] {
  const items: GoogleNewsItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match

  while ((match = itemRegex.exec(xml)) !== null && items.length < maxArticles) {
    const block = match[1]
    const title = textValue(block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '')
    const link = textValue(block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] ?? '')
    const pubDate = textValue(block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] ?? '')
    const description = textValue(block.match(/<description>([\s\S]*?)<\/description>/i)?.[1] ?? '')
    const source = textValue(block.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] ?? '')

    if (!title || !link) continue

    const published = pubDate ? new Date(pubDate) : new Date()
    const published_at = Number.isNaN(published.getTime())
      ? new Date().toISOString()
      : published.toISOString()

    items.push({
      title: title.replace(/<!\[CDATA\[|\]\]>/g, ''),
      url: link,
      summary: description.replace(/<[^>]+>/g, '').slice(0, 500),
      published_at,
      source_name: source || 'Google News',
    })
  }

  return items
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
    const body = (await req.json()) as FetchGoogleNewsRequest
    const maxArticles = Math.min(Math.max(body.maxArticles ?? 25, 1), 100)
    const url = buildRssUrl(body)
    const startedAt = performance.now()

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/rss+xml, application/xml, text/xml, */*',
          'User-Agent': 'MX-Intelligence-GoogleNews-Fetcher/1.0',
        },
      })

      const xml = await response.text()
      const durationMs = Math.round(performance.now() - startedAt)

      if (!response.ok) {
        return jsonResponse({
          success: false,
          error: 'Google News feed returned non-200 status',
          httpStatus: response.status,
          durationMs,
        })
      }

      const items = parseRssItems(xml, maxArticles)

      if (items.length === 0) {
        return jsonResponse({
          success: false,
          error: 'No Google News articles found',
          httpStatus: response.status,
          durationMs,
        })
      }

      return jsonResponse({
        success: true,
        items,
        durationMs,
        httpStatus: response.status,
        feedUrl: url,
      })
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return jsonResponse({ success: false, error: 'Google News request timed out' })
    }
    return jsonResponse({ success: false, error: 'Failed to fetch Google News articles' })
  }
})
