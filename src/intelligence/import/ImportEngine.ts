import { duplicateEngine } from '@/intelligence/duplicate/DuplicateEngine'
import { createDuplicateBatchState } from '@/intelligence/duplicate/DuplicateResult'
import type { DuplicateEngineImportResult } from '@/intelligence/duplicate/DuplicateResult'
import type { IntelligenceItem } from '@/intelligence/types/IntelligenceItem'
import { safeSlice, safeStringOr, safeTrim } from '@/lib/safeString'
import { supabase } from '@/lib/supabase'
import { isMissingColumnError } from '@/lib/supabaseErrors'
import { buildArticleMetadata } from '@/services/providerNormalizer'
import { runPostImportPipeline } from '@/services/postImportPipelineService'
import type { Source } from '@/types/source'

export interface ImportEngineResult extends DuplicateEngineImportResult {
  processedArticleIds?: string[]
  entitiesExtracted?: number
  briefGenerated?: boolean
  timelineUpdated?: boolean
  graphUpdated?: boolean
  alertsEvaluated?: number
}

export interface ImportOptions {
  source?: Source
  downloaded?: number
  connectorHealthy?: boolean
  duplicateMode?: 'strict' | 'normal' | 'lenient'
  syncId?: string | null
}

export async function importIntelligenceItems(
  items: IntelligenceItem[],
  userId: string,
  options?: ImportOptions,
): Promise<ImportEngineResult> {
  if (items.length === 0) {
    const emptyResult: ImportEngineResult = {
      imported: 0,
      skipped: 0,
      updated: 0,
      failed: 0,
    }
    if (options?.source) {
      const postImport = await runPostImportPipeline(
        options.source,
        options.downloaded ?? 0,
        emptyResult,
        [],
        { syncId: options.syncId },
      )
      return {
        ...emptyResult,
        entitiesExtracted: postImport.entitiesExtracted,
        briefGenerated: postImport.briefGenerated,
        timelineUpdated: postImport.timelineUpdated,
        graphUpdated: postImport.graphUpdated,
        alertsEvaluated: postImport.alertsEvaluated,
      }
    }
    return emptyResult
  }

  const index = await duplicateEngine.buildExistingIndex(items)
  const batchState = createDuplicateBatchState()
  const classifiedItems = await duplicateEngine.classifyItems(items)
  const duplicateMode = options?.duplicateMode ?? 'normal'

  let imported = 0
  let skipped = 0
  let updated = 0
  let failed = 0
  const processedArticleIds: string[] = []

  for (const { item, fingerprint } of classifiedItems) {
    const check = duplicateEngine.checkDuplicate(
      item,
      fingerprint,
      index,
      batchState,
      duplicateMode,
    )
    const now = new Date().toISOString()
    const summary = safeTrim(item.summary) || safeSlice(item.content, 0, 280)
    const content = safeTrim(item.content) || summary
    const normalizedUrl = safeTrim(item.url)

    if (check.classification === 'duplicate') {
      if (check.matchedArticleId) {
        await mergeDuplicateEvidence(check.matchedArticleId, item)
      }
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
        processedArticleIds.push(check.matchedArticleId)
        duplicateEngine.markImported(fingerprint, batchState)
      } catch {
        failed += 1
      }
      continue
    }

    try {
      const insertPayload = {
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
        metadata: buildArticleMetadata(item),
      }

      const { data, error } = await supabase.from('articles').insert(insertPayload).select('id').single()

      if (error && isMissingColumnError(error)) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('articles')
          .insert({
            title: insertPayload.title,
            source: insertPayload.source,
            url: insertPayload.url,
            content: insertPayload.content,
            summary: insertPayload.summary,
            category: insertPayload.category,
            image_url: insertPayload.image_url,
            published_at: insertPayload.published_at,
            created_at: insertPayload.created_at,
            created_by: insertPayload.created_by,
          })
          .select('id')
          .single()

        if (fallbackError) {
          if (fallbackError.code === '23505') {
            skipped += 1
            duplicateEngine.markImported(fingerprint, batchState)
          } else {
            failed += 1
          }
          continue
        }

        imported += 1
        if (fallbackData?.id) {
          processedArticleIds.push(String(fallbackData.id))
        }
        duplicateEngine.markImported(fingerprint, batchState)
        continue
      }

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
      if (data?.id) {
        processedArticleIds.push(String(data.id))
      }
      duplicateEngine.markImported(fingerprint, batchState)
    } catch {
      failed += 1
    }
  }

  const result: ImportEngineResult = { imported, skipped, updated, failed, processedArticleIds }

  if (options?.source) {
    const postImport = await runPostImportPipeline(
      options.source,
      options.downloaded ?? items.length,
      result,
      processedArticleIds,
      { syncId: options.syncId },
    )
    return {
      ...result,
      entitiesExtracted: postImport.entitiesExtracted,
      briefGenerated: postImport.briefGenerated,
      timelineUpdated: postImport.timelineUpdated,
      graphUpdated: postImport.graphUpdated,
      alertsEvaluated: postImport.alertsEvaluated,
    }
  }

  return result
}

async function mergeDuplicateEvidence(
  articleId: string,
  item: IntelligenceItem,
): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('metadata')
      .eq('id', articleId)
      .maybeSingle()

    if (error || !data) {
      return
    }

    const existing = (data.metadata as Record<string, unknown>) ?? {}
    const metadata = buildArticleMetadata(item, existing)

    await supabase.from('articles').update({ metadata }).eq('id', articleId)
  } catch {
    // Evidence merge is best-effort
  }
}
