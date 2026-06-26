import { supabase } from '@/lib/supabase'
import { parseConnectorConfig } from '@/lib/connectorConfig'
import { getNewsApiMode } from '@/lib/connectorConfig'
import type { NewsAPIArticle } from '@/types/newsapi'
import type { Source } from '@/types/source'

interface NewsApiFetchResponse {
  success: boolean
  articles?: NewsAPIArticle[]
  error?: string
  durationMs?: number
  httpStatus?: number
  remainingQuota?: string | null
  totalResults?: number
}

export async function fetchArticles(source: Source): Promise<NewsAPIArticle[]> {
  const config = parseConnectorConfig(source)
  const mode = getNewsApiMode(config)

  const { data, error } = await supabase.functions.invoke('fetch-newsapi', {
    body: {
      mode,
      country: config.country,
      category: config.category,
      language: config.language,
      query: config.query ?? source.url,
      fromDate: config.fromDate,
      toDate: config.toDate,
      pageSize: config.pageSize ?? 25,
      page: config.page ?? 1,
      sortBy: config.sortBy,
    },
  })

  if (error) {
    throw new Error('Failed to fetch NewsAPI articles')
  }

  const payload = data as NewsApiFetchResponse

  if (!payload?.success) {
    throw new Error(payload?.error ?? 'Failed to fetch NewsAPI articles')
  }

  return payload.articles ?? []
}
