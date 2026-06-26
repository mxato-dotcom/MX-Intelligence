import { runConnectorImportPipeline } from '@/services/connectorImportPipeline'
import { logSyncEvent } from '@/services/syncHistoryService'
import { sourceTypeToConnectorId } from '@/services/connectorHealthService'
import type { FeedImportResult } from '@/types/rss'
import type { Source } from '@/types/source'

export interface JobExecutionResult extends FeedImportResult {
  syncHistoryId?: string | null
  entitiesExtracted?: number
  briefGenerated?: boolean
  timelineUpdated?: boolean
  graphUpdated?: boolean
  alertsEvaluated?: number
  httpStatus?: number | null
  providerResponse?: string | null
}

export async function executeSyncJob(
  source: Source,
  userId: string,
  options?: { jobId?: string },
): Promise<JobExecutionResult> {
  const connectorId = sourceTypeToConnectorId(source.source_type)
  const startedAt = performance.now()

  if (connectorId) {
    await logSyncEvent({
      connectorId,
      message: `Job ${options?.jobId ?? 'manual'} started for ${source.name}`,
    })
  }

  const result = await runConnectorImportPipeline(source, userId)

  const durationMs = Math.round(performance.now() - startedAt)

  if (connectorId) {
    await logSyncEvent({
      connectorId,
      durationMs,
      message: `Job completed: ${result.imported} imported, ${result.skipped} duplicates`,
    })
  }

  return {
    ...result,
    durationMs: result.durationMs ?? durationMs,
    entitiesExtracted: result.entitiesExtracted ?? 0,
    briefGenerated: result.briefGenerated ?? false,
    timelineUpdated: result.timelineUpdated ?? false,
    graphUpdated: result.graphUpdated ?? false,
    alertsEvaluated: result.alertsEvaluated ?? 0,
  }
}
