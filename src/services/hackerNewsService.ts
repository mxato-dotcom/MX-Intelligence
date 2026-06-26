import { supabase } from '@/lib/supabase'
import type { HackerNewsItem } from '@/types/hackerNews'
import type { HackerNewsFeed } from '@/types/connectorConfig'

interface HnFetchResponse {
  success: boolean
  stories?: HackerNewsItem[]
  error?: string
  durationMs?: number
  httpStatus?: number
}

export async function collectStories(
  feed: HackerNewsFeed,
  limit = 30,
  query?: string,
): Promise<HackerNewsItem[]> {
  const { data, error } = await supabase.functions.invoke('fetch-hackernews', {
    body: {
      feed,
      limit,
      query: query?.trim() || undefined,
    },
  })

  if (error) {
    throw new Error('Failed to fetch Hacker News stories')
  }

  const payload = data as HnFetchResponse

  if (!payload?.success) {
    throw new Error(payload?.error ?? 'Failed to fetch Hacker News stories')
  }

  return (payload.stories ?? []).map((story) => ({
    id: story.id,
    title: story.title,
    url: story.url,
    author: story.author,
    score: story.score,
    time: story.time,
    text: story.text,
    type: story.type ?? 'story',
    num_comments: story.num_comments ?? 0,
  }))
}
