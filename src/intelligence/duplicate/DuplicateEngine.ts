import {
  buildFingerprintFromItem,
  buildNormalizedTitle,
  normalizePublishedDate,
  normalizeUrl,
  type ArticleFingerprint,
} from '@/intelligence/duplicate/Fingerprint'
import type {
  DuplicateBatchState,
  DuplicateCheckResult,
  DuplicateClassification,
  DuplicateMatchReason,
  ExistingArticleIndex,
  ExistingArticleRecord,
} from '@/intelligence/duplicate/DuplicateResult'
import {
  buildTitleDateKey,
} from '@/intelligence/duplicate/DuplicateResult'
import type { IntelligenceItem } from '@/intelligence/types/IntelligenceItem'
import { safeSlice, safeStringOr, safeTrim } from '@/lib/safeString'
import { supabase } from '@/lib/supabase'

interface IntelligenceItemFingerprint {
  item: IntelligenceItem
  fingerprint: ArticleFingerprint
}

function metadataNeedsUpdate(
  existing: ExistingArticleRecord,
  item: IntelligenceItem,
): boolean {
  const summary = safeTrim(item.summary) || safeSlice(item.content, 0, 280)
  const content = safeTrim(item.content) || summary

  return (
    safeTrim(existing.summary) !== summary ||
    safeTrim(existing.content) !== content ||
    (existing.image_url ?? null) !== (item.imageUrl ?? null) ||
    safeTrim(existing.category) !== safeStringOr(item.category, 'Uncategorized')
  )
}

function classifyFromMatch(
  existing: ExistingArticleRecord,
  item: IntelligenceItem,
  reason: DuplicateMatchReason,
): DuplicateCheckResult {
  if (metadataNeedsUpdate(existing, item)) {
    return {
      classification: 'updated',
      reason,
      matchedArticleId: existing.id,
    }
  }

  return {
    classification: 'duplicate',
    reason,
    matchedArticleId: existing.id,
  }
}

function checkBatchDuplicate(
  fingerprint: ArticleFingerprint,
  batchState: DuplicateBatchState,
): boolean {
  if (batchState.urls.has(fingerprint.normalizedUrl)) {
    return true
  }

  if (batchState.normalizedTitles.has(fingerprint.normalizedTitle)) {
    return true
  }

  const titleDateKey = buildTitleDateKey(
    fingerprint.normalizedTitle,
    fingerprint.publishedDateKey,
  )

  if (batchState.titleDateKeys.has(titleDateKey)) {
    return true
  }

  if (batchState.fingerprints.has(fingerprint.fingerprint)) {
    return true
  }

  return false
}

function markBatchSeen(fingerprint: ArticleFingerprint, batchState: DuplicateBatchState): void {
  batchState.urls.add(fingerprint.normalizedUrl)
  batchState.normalizedTitles.add(fingerprint.normalizedTitle)
  batchState.titleDateKeys.add(
    buildTitleDateKey(fingerprint.normalizedTitle, fingerprint.publishedDateKey),
  )
  batchState.fingerprints.add(fingerprint.fingerprint)
}

async function mapArticleRecord(
  row: Record<string, unknown>,
): Promise<ExistingArticleRecord> {
  const title = String(row.title ?? '')
  const url = String(row.url ?? '')
  const published_at = String(row.published_at ?? '')

  const fingerprint = await buildFingerprintFromItem({
    title,
    url,
    publishedAt: published_at,
  })

  return {
    id: String(row.id),
    url,
    title,
    published_at,
    summary: String(row.summary ?? ''),
    content: String(row.content ?? ''),
    category: String(row.category ?? ''),
    image_url: (row.image_url as string | null) ?? null,
    normalizedUrl: fingerprint.normalizedUrl,
    normalizedTitle: fingerprint.normalizedTitle,
    publishedDateKey: fingerprint.publishedDateKey,
    fingerprint: fingerprint.fingerprint,
  }
}

export class DuplicateEngine {
  async buildExistingIndex(items: IntelligenceItem[]): Promise<ExistingArticleIndex> {
    const uniqueUrls = [...new Set(items.map((item) => safeTrim(item.url)).filter(Boolean))]
    const uniqueTitles = [...new Set(items.map((item) => safeTrim(item.title)).filter(Boolean))]

    const records: ExistingArticleRecord[] = []
    const seenIds = new Set<string>()

    if (uniqueUrls.length > 0) {
      const { data, error } = await supabase
        .from('articles')
        .select('id, url, title, published_at, summary, content, category, image_url')
        .in('url', uniqueUrls)

      if (error) {
        throw error
      }

      for (const row of data ?? []) {
        const record = await mapArticleRecord(row as Record<string, unknown>)
        if (!seenIds.has(record.id)) {
          seenIds.add(record.id)
          records.push(record)
        }
      }
    }

    if (uniqueTitles.length > 0) {
      const { data, error } = await supabase
        .from('articles')
        .select('id, url, title, published_at, summary, content, category, image_url')
        .in('title', uniqueTitles)

      if (error) {
        throw error
      }

      for (const row of data ?? []) {
        const record = await mapArticleRecord(row as Record<string, unknown>)
        if (!seenIds.has(record.id)) {
          seenIds.add(record.id)
          records.push(record)
        }
      }
    }

    const byUrl = new Map<string, ExistingArticleRecord>()
    const byNormalizedTitle = new Map<string, ExistingArticleRecord[]>()
    const byTitleDate = new Map<string, ExistingArticleRecord>()
    const byFingerprint = new Map<string, ExistingArticleRecord>()

    for (const record of records) {
      if (!byUrl.has(record.normalizedUrl)) {
        byUrl.set(record.normalizedUrl, record)
      }

      const titleMatches = byNormalizedTitle.get(record.normalizedTitle) ?? []
      titleMatches.push(record)
      byNormalizedTitle.set(record.normalizedTitle, titleMatches)

      const titleDateKey = buildTitleDateKey(record.normalizedTitle, record.publishedDateKey)
      if (!byTitleDate.has(titleDateKey)) {
        byTitleDate.set(titleDateKey, record)
      }

      if (!byFingerprint.has(record.fingerprint)) {
        byFingerprint.set(record.fingerprint, record)
      }
    }

    return {
      byUrl,
      byNormalizedTitle,
      byTitleDate,
      byFingerprint,
      records,
    }
  }

  checkDuplicate(
    item: IntelligenceItem,
    fingerprint: ArticleFingerprint,
    index: ExistingArticleIndex,
    batchState: DuplicateBatchState,
  ): DuplicateCheckResult {
    if (checkBatchDuplicate(fingerprint, batchState)) {
      return { classification: 'duplicate', reason: 'batch_duplicate' }
    }

    const urlMatch = index.byUrl.get(fingerprint.normalizedUrl)
    if (urlMatch) {
      return classifyFromMatch(urlMatch, item, 'url')
    }

    const titleMatches = index.byNormalizedTitle.get(fingerprint.normalizedTitle)
    if (titleMatches && titleMatches.length > 0) {
      return classifyFromMatch(titleMatches[0], item, 'title')
    }

    const titleDateKey = buildTitleDateKey(
      fingerprint.normalizedTitle,
      fingerprint.publishedDateKey,
    )
    const titleDateMatch = index.byTitleDate.get(titleDateKey)
    if (titleDateMatch) {
      return classifyFromMatch(titleDateMatch, item, 'title_and_date')
    }

    const fingerprintMatch = index.byFingerprint.get(fingerprint.fingerprint)
    if (fingerprintMatch) {
      return classifyFromMatch(fingerprintMatch, item, 'fingerprint')
    }

    return { classification: 'new' }
  }

  async classifyItems(items: IntelligenceItem[]): Promise<IntelligenceItemFingerprint[]> {
    return Promise.all(
      items.map(async (item) => ({
        item,
        fingerprint: await buildFingerprintFromItem(item),
      })),
    )
  }

  markImported(fingerprint: ArticleFingerprint, batchState: DuplicateBatchState): void {
    markBatchSeen(fingerprint, batchState)
  }
}

export const duplicateEngine = new DuplicateEngine()

export function normalizeItemTitle(title: string): string {
  return buildNormalizedTitle(title)
}

export function normalizeItemUrl(url: string): string {
  return normalizeUrl(url)
}

export function normalizeItemPublishedDate(publishedAt: string): string {
  return normalizePublishedDate(publishedAt)
}

export type { DuplicateClassification, DuplicateCheckResult }
