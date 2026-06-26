import { supabase } from '@/lib/supabase'
import { parseConnectorConfig } from '@/lib/connectorConfig'
import * as connectorSettingsService from '@/services/connectorSettingsService'
import type { ParsedRSSFeed, ParsedRSSItem } from '@/types/rss'
import type { Source } from '@/types/source'

interface GoogleNewsItem {
  title: string
  url: string
  summary: string
  published_at: string
  source_name: string
}

interface GoogleNewsFetchResponse {
  success: boolean
  items?: GoogleNewsItem[]
  error?: string
  durationMs?: number
  httpStatus?: number
}

function mapToParsedItem(item: GoogleNewsItem): ParsedRSSItem {
  return {
    title: item.title,
    url: item.url,
    summary: item.summary,
    content: item.summary,
    image: null,
    author: item.source_name,
    published_at: item.published_at,
    language: null,
    external_id: item.url,
  }
}

export async function collectFeed(source: Source): Promise<ParsedRSSFeed> {
  const config = parseConnectorConfig(source)
  const settings = await connectorSettingsService.getConnectorSettings()
  const query = config.query ?? source.url ?? settings.googleNews.defaultSearchQuery

  const { data, error } = await supabase.functions.invoke('fetch-google-news', {
    body: {
      query,
      language: config.language ?? settings.googleNews.language,
      country: config.region ?? settings.googleNews.country,
      timePeriod: config.timePeriod,
      maxArticles: settings.googleNews.maxArticles,
      topic: config.topic,
    },
  })

  if (error) {
    throw new Error('Failed to fetch Google News articles')
  }

  const payload = data as GoogleNewsFetchResponse

  if (!payload?.success) {
    throw new Error(payload?.error ?? 'Failed to fetch Google News articles')
  }

  const items = (payload.items ?? []).map(mapToParsedItem)

  return {
    title: source.name,
    language: config.language ?? settings.googleNews.language,
    items,
  }
}
