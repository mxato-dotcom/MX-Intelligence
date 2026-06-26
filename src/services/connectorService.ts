import { getConnector } from '@/intelligence/connector/connectorRegistry'
import { importIntelligenceItems } from '@/intelligence/import/ImportEngine'
import type { IntelligenceItem } from '@/intelligence/types/IntelligenceItem'
import type {
  ConnectorHealthResult,
  ConnectorPreviewResult,
  ConnectorValidationResult,
} from '@/intelligence/types'
import { mapRssError } from '@/lib/rssErrors'
import * as sourceService from '@/services/sourceService'
import type { FeedImportOptions, FeedImportResult } from '@/types/rss'
import type { Source } from '@/types/source'

function filterSelectedItems(
  items: IntelligenceItem[],
  selectedIds?: string[],
): IntelligenceItem[] {
  if (!selectedIds || selectedIds.length === 0) {
    return items
  }

  const selected = new Set(selectedIds)
  return items.filter((item) => selected.has(item.id))
}

async function executeImport(
  source: Source,
  userId: string,
  items: IntelligenceItem[],
  selectedIds?: string[],
): Promise<FeedImportResult> {
  const startedAt = performance.now()
  const downloaded = items.length
  const toImport = filterSelectedItems(items, selectedIds)

  const importResult = await importIntelligenceItems(toImport, userId)

  await sourceService.updateSourceAfterImport(
    source.id,
    importResult.imported + importResult.updated,
  )

  return {
    downloaded,
    imported: importResult.imported,
    skipped: importResult.skipped,
    updated: importResult.updated,
    failed: importResult.failed,
    durationMs: Math.round(performance.now() - startedAt),
  }
}

export async function validateSource(source: Source): Promise<ConnectorValidationResult> {
  return getConnector(source.source_type).validate(source)
}

export async function runHealthCheck(source: Source): Promise<ConnectorHealthResult> {
  return getConnector(source.source_type).healthCheck(source)
}

export async function previewFeed(source: Source): Promise<ConnectorPreviewResult> {
  return getConnector(source.source_type).preview(source)
}

export async function collectFeedItems(source: Source): Promise<IntelligenceItem[]> {
  const connector = getConnector(source.source_type)

  try {
    return await connector.collect(source)
  } catch (error) {
    throw new Error(mapRssError(error))
  }
}

export async function importArticlesFromFeed(
  source: Source,
  userId: string,
  selectedIds?: string[],
): Promise<FeedImportResult> {
  const items = await collectFeedItems(source)
  return executeImport(source, userId, items, selectedIds)
}

export async function importFeed(options: FeedImportOptions): Promise<FeedImportResult> {
  const { source, userId, selectedIds, items } = options

  if (items && items.length > 0) {
    return executeImport(source, userId, items, selectedIds)
  }

  return importArticlesFromFeed(source, userId, selectedIds)
}
