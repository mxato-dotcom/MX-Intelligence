import { getConnector } from '@/intelligence/connector/connectorRegistry'
import type { NormalizedIntelligenceArticle } from '@/intelligence/types'
import type {
  ConnectorHealthResult,
  ConnectorPreviewResult,
  ConnectorValidationResult,
} from '@/intelligence/types'
import { mapRssError } from '@/lib/rssErrors'
import * as articleService from '@/services/articleService'
import * as sourceService from '@/services/sourceService'
import type { FeedImportOptions, FeedImportResult } from '@/types/rss'
import type { Source } from '@/types/source'

function filterSelectedItems(
  items: NormalizedIntelligenceArticle[],
  selectedHashes?: string[],
): NormalizedIntelligenceArticle[] {
  if (!selectedHashes || selectedHashes.length === 0) {
    return items
  }

  const selected = new Set(selectedHashes)
  return items.filter((item) => selected.has(item.hash))
}

async function executeImport(
  source: Source,
  userId: string,
  items: NormalizedIntelligenceArticle[],
  selectedHashes?: string[],
): Promise<FeedImportResult> {
  const startedAt = performance.now()
  const downloaded = items.length
  const toImport = filterSelectedItems(items, selectedHashes)

  const importResult = await articleService.importNormalizedArticles(toImport, userId)

  await sourceService.updateSourceAfterImport(source.id, importResult.imported)

  return {
    downloaded,
    imported: importResult.imported,
    skipped: importResult.skipped,
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

export async function collectFeedItems(source: Source): Promise<NormalizedIntelligenceArticle[]> {
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
  selectedHashes?: string[],
): Promise<FeedImportResult> {
  const items = await collectFeedItems(source)
  return executeImport(source, userId, items, selectedHashes)
}

export async function importFeed(options: FeedImportOptions): Promise<FeedImportResult> {
  const { source, userId, selectedHashes, items } = options

  if (items && items.length > 0) {
    return executeImport(source, userId, items, selectedHashes)
  }

  return importArticlesFromFeed(source, userId, selectedHashes)
}
