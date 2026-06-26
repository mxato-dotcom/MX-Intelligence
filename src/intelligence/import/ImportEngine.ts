import { duplicateEngine } from '@/intelligence/duplicate/DuplicateEngine'
import { createDuplicateBatchState } from '@/intelligence/duplicate/DuplicateResult'
import type { DuplicateEngineImportResult } from '@/intelligence/duplicate/DuplicateResult'
import type { IntelligenceItem } from '@/intelligence/types/IntelligenceItem'
import { supabase } from '@/lib/supabase'

export type ImportEngineResult = DuplicateEngineImportResult

export async function importIntelligenceItems(
  items: IntelligenceItem[],
  userId: string,
): Promise<ImportEngineResult> {
  if (items.length === 0) {
    return { imported: 0, skipped: 0, updated: 0, failed: 0 }
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
    const summary = item.summary.trim() || item.content.trim().slice(0, 280)
    const content = item.content.trim() || summary
    const normalizedUrl = item.url.trim()

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
            category: item.category.trim() || 'Uncategorized',
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
        title: item.title.trim() || 'Untitled',
        source: item.sourceName.trim(),
        url: normalizedUrl,
        content,
        summary,
        category: item.category.trim() || 'Uncategorized',
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

  return { imported, skipped, updated, failed }
}
