export type NewsApiMode = 'top_headlines' | 'everything'

export type RedditSort = 'hot' | 'new' | 'top' | 'rising' | 'search'

export type HackerNewsFeed =
  | 'top'
  | 'new'
  | 'best'
  | 'ask'
  | 'show'
  | 'jobs'

export interface ConnectorConfig {
  mode?: NewsApiMode | string
  country?: string
  language?: string
  category?: string
  query?: string
  region?: string
  topic?: string
  subreddit?: string
  sort?: RedditSort | string
  feed?: HackerNewsFeed | string
  fromDate?: string
  toDate?: string
  pageSize?: number
  timePeriod?: string
  page?: number
  sortBy?: string
}

export const API_KEY_PROVIDERS = [
  { id: 'newsapi', label: 'NewsAPI Key' },
  { id: 'reddit_client_id', label: 'Reddit App ID' },
  { id: 'reddit_client_secret', label: 'Reddit Secret' },
  { id: 'reddit_refresh_token', label: 'Reddit Refresh Token' },
] as const

export type ApiKeyProviderId = (typeof API_KEY_PROVIDERS)[number]['id']
