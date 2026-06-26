import type { DuplicateEngineImportResult } from '@/intelligence/duplicate/DuplicateResult'
import { trustScoreEngine } from '@/intelligence/scoring/TrustScoreEngine'
import { generateAndStoreDailyBrief } from '@/services/dailyBriefService'
import { extractAndStoreForArticleIds } from '@/services/entityExtractionService'
import { rebuildFusionClusters } from '@/services/fusionClusterService'
import { clearGraphCache, buildGraph } from '@/services/graphService'
import { clearTimelineCache, buildTimeline } from '@/services/timelineService'
import { getAlerts } from '@/services/alertService'
import { logSyncEvent } from '@/services/syncHistoryService'
import { sourceTypeToConnectorId } from '@/services/connectorHealthService'
import * as sourceService from '@/services/sourceService'
import type { Source } from '@/types/source'

export interface PostImportPipelineResult {
  entitiesExtracted: number
  briefGenerated: boolean
  timelineUpdated: boolean
  graphUpdated: boolean
  alertsEvaluated: number
  clustersRecalculated: boolean
}

export async function runPostImportPipeline(
  source: Source,
  downloaded: number,
  importResult: DuplicateEngineImportResult,
  processedArticleIds: string[] = [],
  options?: { syncId?: string | null },
): Promise<PostImportPipelineResult> {
  const connectorId = sourceTypeToConnectorId(source.source_type)
  const result: PostImportPipelineResult = {
    entitiesExtracted: 0,
    briefGenerated: false,
    timelineUpdated: false,
    graphUpdated: false,
    alertsEvaluated: 0,
    clustersRecalculated: false,
  }

  await sourceService.updateSourceAfterImport(source.id, importResult.imported + importResult.updated)
  const refreshed = await sourceService.getSourceById(source.id) ?? source

  await trustScoreEngine.recordImportAndRecalculate(
    refreshed,
    downloaded,
    importResult,
    true,
  )

  if (connectorId && options?.syncId) {
    await logSyncEvent({
      syncId: options.syncId,
      connectorId,
      message: 'Trust scores updated',
    })
  }

  await rebuildFusionClusters()
  result.clustersRecalculated = true

  if (processedArticleIds.length > 0) {
    await extractAndStoreForArticleIds(processedArticleIds)
    result.entitiesExtracted = processedArticleIds.length
  }

  if (connectorId && options?.syncId) {
    await logSyncEvent({
      syncId: options.syncId,
      connectorId,
      message: `Entity extraction completed (${result.entitiesExtracted} articles)`,
    })
  }

  try {
    await generateAndStoreDailyBrief()
    result.briefGenerated = true
    if (connectorId && options?.syncId) {
      await logSyncEvent({
        syncId: options.syncId,
        connectorId,
        message: 'Daily brief generated',
      })
    }
  } catch {
    // Brief generation should not block import completion
  }

  try {
    clearTimelineCache()
    await buildTimeline()
    result.timelineUpdated = true
  } catch {
    // Timeline rebuild is best-effort
  }

  try {
    clearGraphCache()
    await buildGraph()
    result.graphUpdated = true
  } catch {
    // Graph rebuild is best-effort
  }

  try {
    const alerts = await getAlerts()
    result.alertsEvaluated = alerts.length
  } catch {
    // Alert evaluation is best-effort
  }

  return result
}
