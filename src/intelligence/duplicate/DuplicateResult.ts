export type DuplicateClassification = 'duplicate' | 'new' | 'updated'

export type DuplicateMatchReason =
  | 'url'
  | 'title'
  | 'title_and_date'
  | 'fingerprint'
  | 'batch_duplicate'

export interface DuplicateCheckResult {
  classification: DuplicateClassification
  reason?: DuplicateMatchReason
  matchedArticleId?: string
}

export interface DuplicateBatchState {
  urls: Set<string>
  normalizedTitles: Set<string>
  titleDateKeys: Set<string>
  fingerprints: Set<string>
}

export interface ExistingArticleRecord {
  id: string
  url: string
  title: string
  published_at: string
  summary: string
  content: string
  category: string
  image_url: string | null
  normalizedUrl: string
  normalizedTitle: string
  publishedDateKey: string
  fingerprint: string
}

export interface ExistingArticleIndex {
  byUrl: Map<string, ExistingArticleRecord>
  byNormalizedTitle: Map<string, ExistingArticleRecord[]>
  byTitleDate: Map<string, ExistingArticleRecord>
  byFingerprint: Map<string, ExistingArticleRecord>
  records: ExistingArticleRecord[]
}

export interface DuplicateEngineImportResult {
  imported: number
  skipped: number
  updated: number
  failed: number
}

export function createDuplicateBatchState(): DuplicateBatchState {
  return {
    urls: new Set<string>(),
    normalizedTitles: new Set<string>(),
    titleDateKeys: new Set<string>(),
    fingerprints: new Set<string>(),
  }
}

export function buildTitleDateKey(normalizedTitle: string, publishedDateKey: string): string {
  return `${normalizedTitle}::${publishedDateKey}`
}
