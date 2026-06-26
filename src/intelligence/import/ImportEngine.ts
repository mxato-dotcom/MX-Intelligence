import { duplicateEngine } from '@/intelligence/duplicate/DuplicateEngine'
import { createDuplicateBatchState } from '@/intelligence/duplicate/DuplicateResult'
import type { DuplicateEngineImportResult } from '@/intelligence/duplicate/DuplicateResult'
import { trustScoreEngine } from '@/intelligence/scoring/TrustScoreEngine'
import { rebuildFusionClusters } from '@/services/fusionClusterService'
import type { IntelligenceItem } from '@/intelligence/types/IntelligenceItem'
import { safeSlice, safeStringOr, safeTrim } from '@/lib/safeString'
import { supabase } from '@/lib/supabase'
import * as sourceService from '@/services/sourceService'
import type { Source } from '@/types/source'

export type ImportEngineResult = DuplicateEngineImportResult

export interface ImportOptions {
  source?: Source
  downloaded?: number
  connectorHealthy?: boolean
}

async function finalizeSourceImport(
  source: Source,
  downloaded: number,
  result: ImportEngineResult,
  connectorHealthy = true,
): Promise<void> {
  await sourceService.updateSourceAfterImport(source.id, result.imported + result.updated)
  const refreshed = await sourceService.getSourceById(source.id) ?? source
  await trustScoreEngine.recordImportAndRecalculate(
    refreshed,
    downloaded,
    result,
    connectorHealthy,
  )
  await rebuildFusionClusters()
}

export async function importIntelligenceItems(
  items: IntelligenceItem[],
  userId: string,
  options?: ImportOptions,
): Promise<ImportEngineResult> {
  if (items.length === 0) {
    const emptyResult = { imported: 0, skipped: 0, updated: 0, failed: 0 }
    if (options?.source) {
      await finalizeSourceImport(
        options.source,
        options.downloaded ?? 0,
        emptyResult,
        options.connectorHealthy,
      )
    }
    return emptyResult
  }

  const index = await duplicateEngine.buildExistingIndex(items)
  const batchState = createDuplicateBatchState()
  const classifiedItems = await duplicateEngine.classifyItems(items)

  let imported = 0
  let skipped = 0
  let updated = 0
  let failed = 0

  for (const { item, fingerprint } of classifiedItems) {
    const check = duplicateEngine.checkDuplicate(item, fingerprint, index, batchState)
    const now = new Date().toISOString()
    const summary = safeTrim(item.summary) || safeSlice(item.content, 0, 280)
    const content = safeTrim(item.content) || summary
    const normalizedUrl = safeTrim(item.url)

    if (check.classification === 'duplicate') {
      skipped += 1
      duplicateEngine.markImported(fingerprint, batchState)
      continue
    }

    if (check.classification === 'updated' && check.matchedArticleId) {
      try {
        const { error } = await supabase
          .from('articles')
          .update({
            summary,
            content,
            category: safeStringOr(item.category, 'Uncategorized'),
            image_url: item.imageUrl ?? null,
            published_at: item.publishedAt || now,
          })
          .eq('id', check.matchedArticleId)

        if (error) {
          failed += 1
          continue
        }

        updated += 1
        duplicateEngine.markImported(fingerprint, batchState)
      } catch {
        failed += 1
      }
      continue
    }

    try {
      const { error } = await supabase.from('articles').insert({
        title: safeStringOr(item.title, 'Untitled'),
        source: safeStringOr(item.sourceName, 'Unknown source'),
        url: normalizedUrl,
        content,
        summary,
        category: safeStringOr(item.category, 'Uncategorized'),
        image_url: item.imageUrl ?? null,
        published_at: item.publishedAt || now,
        created_at: now,
        created_by: userId,
      })

      if (error) {
        if (error.code === '23505') {
          skipped += 1
          duplicateEngine.markImported(fingerprint, batchState)
        } else {
          failed += 1
        }
        continue
      }

      imported += 1
      duplicateEngine.markImported(fingerprint, batchState)
    } catch {
      failed += 1
    }
  }

  const result = { imported, skipped, updated, failed }

  if (options?.source) {
    await finalizeSourceImport(
      options.source,
      options.downloaded ?? items.length,
      result,
      options.connectorHealthy,
    )
  }

  return result
}
