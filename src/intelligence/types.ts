/** Universal normalized intelligence item — shared across all connector types. */
export interface NormalizedIntelligenceArticle {
  title: string
  summary: string
  content: string
  url: string
  image: string | null
  author: string | null
  category: string
  published_at: string
  language: string | null
  source: string
  external_id: string | null
  hash: string
}

export type ConnectorSyncStatus = 'never' | 'syncing' | 'completed' | 'failed'

export interface ConnectorPreviewResult {
  success: boolean
  items: NormalizedIntelligenceArticle[]
  downloaded: number
  error?: string
  durationMs: number
}

export interface ConnectorImportResult {
  downloaded: number
  imported: number
  skipped: number
  failed: number
  durationMs: number
}
