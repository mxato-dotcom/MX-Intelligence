import { computeHealthPercent } from '@/components/settings/HealthIndicator'
import { getConnectorHealthRecords } from '@/services/connectorHealthService'
import { getSyncHistory } from '@/services/syncHistoryService'
import type { ConnectorId } from '@/types/connectorSettings'
import type { ConnectorHealthRecord } from '@/types/connectorSettings'

export interface ConnectorMetricsSnapshot {
  connectorId: ConnectorId
  healthScore: number
  successRate: number
  remainingQuota: string | null
  lastHttpStatus: number | null
  totalSyncs: number
  failedSyncs: number
  averageResponseMs: number | null
  lastError: string | null
}

function computeSuccessRate(total: number, failed: number): number {
  if (total <= 0) {
    return 100
  }
  return Math.round(((total - failed) / total) * 100)
}

export function calculateHealthScore(record: ConnectorHealthRecord): number {
  return computeHealthPercent(
    record.connected,
    record.credentialStatus,
    record.lastTestStatus,
    record.lastFailureAt,
  )
}

export async function getConnectorMetrics(
  connectorId: ConnectorId,
): Promise<ConnectorMetricsSnapshot> {
  const records = await getConnectorHealthRecords()
  const record = records.find((entry) => entry.connectorId === connectorId)

  const history = await getSyncHistory(connectorId, 20)
  const totalSyncs = history.length
  const failedSyncs = history.filter((run) => run.status === 'failed').length
  const lastRun = history[0]

  const healthRecord = record ?? {
    connectorId,
    connected: false,
    credentialStatus: 'missing' as const,
    lastTestedAt: null,
    lastTestStatus: null,
    lastTestError: null,
    lastSyncAt: null,
    lastSuccessfulSyncAt: null,
    lastFailureAt: null,
    lastFailureError: null,
    articlesImported: 0,
    averageSyncTimeMs: null,
  }

  return {
    connectorId,
    healthScore: calculateHealthScore(healthRecord),
    successRate: record?.successRate ?? computeSuccessRate(totalSyncs, failedSyncs),
    remainingQuota: lastRun?.remainingQuota ?? record?.remainingQuota ?? null,
    lastHttpStatus: lastRun?.httpStatus ?? record?.lastHttpStatus ?? null,
    totalSyncs: record?.totalSyncs ?? totalSyncs,
    failedSyncs: record?.failedSyncs ?? failedSyncs,
    averageResponseMs: healthRecord.averageSyncTimeMs,
    lastError: healthRecord.lastFailureError ?? lastRun?.errorMessage ?? null,
  }
}

/** Metrics are derived from connector_sync_history — no separate persistence table. */
export async function persistConnectorMetrics(
  _connectorId: ConnectorId,
  _metrics: Partial<ConnectorMetricsSnapshot>,
): Promise<void> {
  // No-op
}

export async function recordSyncMetrics(
  _connectorId: ConnectorId,
  _durationMs: number,
  _importedCount: number,
  _success: boolean,
  _options?: {
    httpStatus?: number | null
    remainingQuota?: string | null
    errorMessage?: string | null
  },
): Promise<void> {
  // No-op: sync history records are written by connectorImportPipeline / test-connector.
}
