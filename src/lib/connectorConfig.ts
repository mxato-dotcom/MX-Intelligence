import { safeTrim } from '@/lib/safeString'
import type { ConnectorConfig, HackerNewsFeed, NewsApiMode, RedditSort } from '@/types/connectorConfig'
import type { Source } from '@/types/source'

export function parseConnectorConfig(source: Source): ConnectorConfig {
  const raw = source.connector_config
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as ConnectorConfig
  }

  return {}
}

export function getNewsApiMode(config: ConnectorConfig): NewsApiMode {
  return config.mode === 'everything' ? 'everything' : 'top_headlines'
}

export function getRedditSort(config: ConnectorConfig): RedditSort {
  const sort = safeTrim(config.sort).toLowerCase()
  if (sort === 'new' || sort === 'top' || sort === 'search' || sort === 'rising') {
    return sort
  }
  return 'hot'
}

export function getHackerNewsFeed(config: ConnectorConfig): HackerNewsFeed {
  const feed = safeTrim(config.feed).toLowerCase()
  const allowed: HackerNewsFeed[] = ['top', 'new', 'best', 'ask', 'show', 'jobs']
  if (allowed.includes(feed as HackerNewsFeed)) {
    return feed as HackerNewsFeed
  }
  return 'top'
}

export function getGoogleNewsRssUrl(source: Source, config: ConnectorConfig): string {
  const query = safeTrim(config.query || source.url)
  const language = safeTrim(config.language) || 'en-US'
  const region = safeTrim(config.region) || 'US'
  const topic = safeTrim(config.topic)

  if (topic) {
    return `https://news.google.com/rss/topics/${encodeURIComponent(topic)}?hl=${language}&gl=${region}&ceid=${region}:en`
  }

  if (!query) {
    return `https://news.google.com/rss?hl=${language}&gl=${region}&ceid=${region}:en`
  }

  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${language}&gl=${region}&ceid=${region}:en`
}

export function getRedditTarget(source: Source, config: ConnectorConfig): string {
  const subreddit = safeTrim(config.subreddit || source.url)
    .replace(/^https?:\/\/(www\.)?reddit\.com\/r\//i, '')
    .replace(/^r\//i, '')
    .replace(/\/.*$/, '')

  return subreddit || 'worldnews'
}

export function getRedditSearchQuery(config: ConnectorConfig, source: Source): string {
  return safeTrim(config.query || source.url)
}
