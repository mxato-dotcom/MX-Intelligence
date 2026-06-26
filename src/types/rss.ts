import type { IntelligenceItem } from '@/intelligence/types/IntelligenceItem'
import type { Source } from '@/types/source'

export interface ParsedRSSItem {
  title: string
  url: string
  summary: string
  content: string
  image: string | null
  author: string | null
  published_at: string
  language: string | null
  external_id: string | null
}

export interface ParsedRSSFeed {
  title: string
  language: string | null
  items: ParsedRSSItem[]
}

export interface FeedPreviewResult {
  success: boolean
  items: IntelligenceItem[]
  downloaded: number
  error?: string
  durationMs: number
}

export interface FeedImportResult {
  downloaded: number
  imported: number
  skipped: number
  updated: number
  failed: number
  durationMs: number
  syncHistoryId?: string | null
  entitiesExtracted?: number
  briefGenerated?: boolean
  timelineUpdated?: boolean
  graphUpdated?: boolean
  alertsEvaluated?: number
  httpStatus?: number | null
  providerResponse?: string | null
}

export interface FeedImportOptions {
  source: Source
  userId: string
  selectedIds?: string[]
  items?: IntelligenceItem[]
}

export interface FetchRssSuccessResponse {
  success: true
  xml: string
  status: number
}

export interface FetchRssErrorResponse {
  success: false
  error: string
  status?: number
}

export type FetchRssResponse = FetchRssSuccessResponse | FetchRssErrorResponse
