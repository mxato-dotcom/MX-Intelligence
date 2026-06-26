import { getConnector } from '@/intelligence/connector/connectorRegistry'
import { importIntelligenceItems } from '@/intelligence/import/ImportEngine'
import type { IntelligenceItem } from '@/intelligence/types/IntelligenceItem'
import { mapConnectorError } from '@/lib/connectorErrors'
import { sourceTypeToConnectorId } from '@/services/connectorHealthService'
import { recordSyncMetrics } from '@/services/connectorMetricsService'
import * as connectorSettingsService from '@/services/connectorSettingsService'
import {
  completeSyncRun,
  createSyncRun,
  logSyncEvent,
} from '@/services/syncHistoryService'
import type { DuplicateDetectionMode } from '@/types/connectorSettings'
import type { FeedImportResult } from '@/types/rss'
import type { Source } from '@/types/source'

function getMaxArticlesForSource(
  source: Source,
  settings: connectorSettingsService.ResolvedConnectorSettings,
): number {
  const sourceType = source.source_type.trim().toLowerCase()

  if (sourceType === 'rss') {
    return settings.rss.maxArticlesPerSync
  }

  if (sourceType === 'google news') {
    return settings.googleNews.maxArticles
  }

  if (sourceType === 'hacker news') {
    return settings.hackerNews.maxStories
  }

  const config = source.connector_config as { pageSize?: number } | undefined
  return config?.pageSize ?? 25
}

export async function collectFromProvider(source: Source): Promise<IntelligenceItem[]> {
  const connector = getConnector(source.source_type)
  return connector.collect(source)
}

export async function runConnectorImportPipeline(
  source: Source,
  userId: string,
  selectedIds?: string[],
): Promise<FeedImportResult> {
  const connectorId = sourceTypeToConnectorId(source.source_type)
  const startedAt = performance.now()
  const syncId = connectorId
    ? await createSyncRun({ connectorId, sourceId: source.id })
    : null

  let fetchStartedAt = performance.now()
  let items: IntelligenceItem[] = []
  let httpStatus: number | null = null
  let remainingQuota: string | null = null

  try {
    const settings = await connectorSettingsService.getConnectorSettings()
    const duplicateMode: DuplicateDetectionMode = settings.rss.duplicateDetectionMode

    items = await collectFromProvider(source)
    const fetchDurationMs = Math.round(performance.now() - fetchStartedAt)

    if (connectorId) {
      await logSyncEvent({
        syncId,
        connectorId,
        durationMs: fetchDurationMs,
        message: `Fetched ${items.length} items from provider`,
      })
    }

    const maxArticles = getMaxArticlesForSource(source, settings)
    const limitedItems =
      selectedIds && selectedIds.length > 0
        ? items.filter((item) => selectedIds.includes(item.id)).slice(0, maxArticles)
        : items.slice(0, maxArticles)

    const importResult = await importIntelligenceItems(limitedItems, userId, {
      source,
      downloaded: limitedItems.length,
      duplicateMode,
      syncId,
    })

    const durationMs = Math.round(performance.now() - startedAt)
    const status =
      importResult.failed > 0 && importResult.imported === 0 ? 'failed' : 'success'

    if (connectorId) {
      await completeSyncRun(syncId, {
        status,
        durationMs,
        articlesDownloaded: limitedItems.length,
        articlesImported: importResult.imported,
        duplicates: importResult.skipped,
        errors: importResult.failed,
        updatedCount: importResult.updated,
        httpStatus,
        remainingQuota,
        errorMessage:
          status === 'failed' ? 'Import failed with no articles imported' : null,
      })

      await recordSyncMetrics(connectorId, durationMs, importResult.imported, status === 'success', {
        httpStatus,
        remainingQuota,
        errorMessage: status === 'failed' ? 'Import failed' : null,
      })
    }

    return {
      downloaded: limitedItems.length,
      imported: importResult.imported,
      skipped: importResult.skipped,
      updated: importResult.updated,
      failed: importResult.failed,
      durationMs,
      syncHistoryId: syncId,
      entitiesExtracted: importResult.entitiesExtracted ?? 0,
      briefGenerated: importResult.briefGenerated ?? false,
      timelineUpdated: importResult.timelineUpdated ?? false,
      graphUpdated: importResult.graphUpdated ?? false,
      alertsEvaluated: importResult.alertsEvaluated ?? 0,
      httpStatus,
    }
  } catch (error) {
    const durationMs = Math.round(performance.now() - startedAt)
    const message = mapConnectorError(error, source.source_type)

    if (connectorId) {
      await completeSyncRun(syncId, {
        status: 'failed',
        durationMs,
        articlesDownloaded: items.length,
        articlesImported: 0,
        duplicates: 0,
        errors: 1,
        updatedCount: 0,
        httpStatus,
        remainingQuota,
        errorMessage: message,
      })

      await logSyncEvent({
        syncId,
        connectorId,
        durationMs,
        httpStatus,
        errorMessage: message,
        message: 'Sync failed',
      })

      await recordSyncMetrics(connectorId, durationMs, 0, false, {
        httpStatus,
        remainingQuota,
        errorMessage: message,
      })
    }

    throw new Error(message)
  }
}
