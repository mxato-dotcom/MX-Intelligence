import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'

const FETCH_TIMEOUT_MS = 20000
const HN_API = 'https://hacker-news.firebaseio.com/v0'
const HN_SEARCH = 'https://hn.algolia.com/api/v1/search'

const FEED_ENDPOINTS: Record<string, string> = {
  top: 'topstories',
  new: 'newstories',
  best: 'beststories',
  ask: 'askstories',
  show: 'showstories',
  jobs: 'jobstories',
}

interface FetchHnRequest {
  feed?: string
  limit?: number
  query?: string
}

interface HnStory {
  id: number
  title: string
  url?: string
  author: string
  score: number
  time: number
  text?: string
  type: string
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

async function fetchStory(id: number): Promise<HnStory | null> {
  const response = await fetchWithTimeout(`${HN_API}/item/${id}.json`)
  if (!response.ok) return null
  const item = await response.json()
  if (!item || item.type !== 'story' || !item.title) return null
  return item as HnStory
}

async function searchStories(query: string, limit: number): Promise<HnStory[]> {
  const url = `${HN_SEARCH}?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${limit}`
  const response = await fetchWithTimeout(url)
  if (!response.ok) {
    throw new Error(`Hacker News search failed (${response.status})`)
  }
  const payload = await response.json()
  const hits = Array.isArray(payload?.hits) ? payload.hits : []
  return hits.map((hit: Record<string, unknown>) => ({
    id: Number(hit.id ?? hit.story_id ?? 0),
    title: String(hit.title ?? ''),
    url: typeof hit.url === 'string' ? hit.url : undefined,
    author: String(hit.author ?? 'unknown'),
    score: Number(hit.points ?? 0),
    time: Number(hit.created_at_i ?? 0),
    text: typeof hit.story_text === 'string' ? hit.story_text : undefined,
    type: 'story',
  }))
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
    const body = (await req.json()) as FetchHnRequest
    const limit = Math.min(Math.max(body.limit ?? 30, 1), 100)
    const query = body.query?.trim()
    const startedAt = performance.now()

    let stories: HnStory[] = []

    if (query) {
      stories = await searchStories(query, limit)
    } else {
      const feed = FEED_ENDPOINTS[body.feed ?? 'top'] ?? FEED_ENDPOINTS.top
      const idsResponse = await fetchWithTimeout(`${HN_API}/${feed}.json`)
      if (!idsResponse.ok) {
        return jsonResponse({
          success: false,
          error: `Hacker News feed request failed (${idsResponse.status})`,
          httpStatus: idsResponse.status,
        })
      }
      const ids = (await idsResponse.json()) as number[]
      const selectedIds = ids.slice(0, limit)
      const fetched = await Promise.all(selectedIds.map((id) => fetchStory(id)))
      stories = fetched.filter((story): story is HnStory => story !== null)
    }

    const durationMs = Math.round(performance.now() - startedAt)

    if (stories.length === 0) {
      return jsonResponse({ success: false, error: 'No Hacker News stories found', durationMs })
    }

    return jsonResponse({
      success: true,
      stories,
      durationMs,
      httpStatus: 200,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return jsonResponse({ success: false, error: 'Hacker News request timed out' })
    }
    return jsonResponse({ success: false, error: 'Failed to fetch Hacker News stories' })
  }
})
