import { getConnector } from '@/intelligence/connector/connectorRegistry'
import { importIntelligenceItems } from '@/intelligence/import/ImportEngine'
import { mapConnectorError } from '@/lib/connectorErrors'
import {
  recordSyncFailure,
  recordSyncSuccess,
  sourceTypeToConnectorId,
} from '@/services/connectorHealthService'
import { runConnectorImportPipeline } from '@/services/connectorImportPipeline'
import * as connectorSettingsService from '@/services/connectorSettingsService'
import type { FeedImportOptions, FeedImportResult } from '@/types/rss'
import type { Source } from '@/types/source'
import type {
  ConnectorHealthResult,
  ConnectorPreviewResult,
  ConnectorValidationResult,
} from '@/intelligence/types'
import { trustScoreEngine } from '@/intelligence/scoring/TrustScoreEngine'
import type { IntelligenceItem } from '@/intelligence/types/IntelligenceItem'

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

async function importPreCollectedItems(
  source: Source,
  userId: string,
  items: IntelligenceItem[],
  selectedIds?: string[],
): Promise<FeedImportResult> {
  const startedAt = performance.now()
  const toImport = filterSelectedItems(items, selectedIds)
  const settings = await connectorSettingsService.getConnectorSettings()

  const importResult = await importIntelligenceItems(toImport, userId, {
    source,
    downloaded: toImport.length,
    duplicateMode: settings.rss.duplicateDetectionMode,
  })

  const durationMs = Math.round(performance.now() - startedAt)
  const connectorId = sourceTypeToConnectorId(source.source_type)

  if (connectorId) {
    try {
      if (importResult.failed > 0 && importResult.imported === 0) {
        await recordSyncFailure(connectorId, 'Import failed with no articles imported')
      } else {
        await recordSyncSuccess(connectorId, durationMs, importResult.imported)
      }
    } catch {
      // best-effort
    }
  }

  return {
    downloaded: toImport.length,
    imported: importResult.imported,
    skipped: importResult.skipped,
    updated: importResult.updated,
    failed: importResult.failed,
    durationMs,
  }
}

export async function validateSource(source: Source): Promise<ConnectorValidationResult> {
  return getConnector(source.source_type).validate(source)
}

export async function runHealthCheck(source: Source): Promise<ConnectorHealthResult> {
  const result = await getConnector(source.source_type).healthCheck(source)
  trustScoreEngine.recordHealthCheck(source.id, result.success && result.status === 'healthy')
  return result
}

export async function previewFeed(source: Source): Promise<ConnectorPreviewResult> {
  return getConnector(source.source_type).preview(source)
}

export async function collectFeedItems(source: Source): Promise<IntelligenceItem[]> {
  const connector = getConnector(source.source_type)
  const connectorId = sourceTypeToConnectorId(source.source_type)

  try {
    return await connector.collect(source)
  } catch (error) {
    const message = mapConnectorError(error, source.source_type)
    if (connectorId) {
      try {
        await recordSyncFailure(connectorId, message)
      } catch {
        // best-effort
      }
    }
    throw new Error(message)
  }
}

export async function importArticlesFromFeed(
  source: Source,
  userId: string,
  selectedIds?: string[],
): Promise<FeedImportResult> {
  return runConnectorImportPipeline(source, userId, selectedIds)
}

export async function importFeed(options: FeedImportOptions): Promise<FeedImportResult> {
  const { source, userId, selectedIds, items } = options

  if (items && items.length > 0) {
    return importPreCollectedItems(source, userId, items, selectedIds)
  }

  return importArticlesFromFeed(source, userId, selectedIds)
}
