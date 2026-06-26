import { supabase } from '@/lib/supabase'
import type { RedditPost } from '@/types/reddit'
import type { RedditSort } from '@/types/connectorConfig'

interface RedditFetchOptions {
  subreddit: string
  sort: RedditSort
  query?: string
  limit?: number
}

interface RedditFetchResponse {
  success: boolean
  posts?: RedditPost[]
  error?: string
}

export async function fetchPosts(options: RedditFetchOptions): Promise<RedditPost[]> {
  const { data, error } = await supabase.functions.invoke('fetch-reddit', {
    body: {
      subreddit: options.subreddit,
      sort: options.sort,
      query: options.query,
      limit: options.limit ?? 25,
    },
  })

  if (error) {
    throw new Error('Failed to fetch Reddit posts')
  }

  const payload = data as RedditFetchResponse

  if (!payload?.success) {
    throw new Error(payload?.error ?? 'Failed to fetch Reddit posts')
  }

  return payload.posts ?? []
}
