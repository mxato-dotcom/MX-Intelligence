import { getSyncHistory } from '@/services/syncHistoryService'
import { getSchedulerRuntimeState } from '@/services/backgroundSyncService'
import { computeQueueStats, getQueueSnapshot } from '@/intelligence/queue/queueService'
import type { ConnectorId } from '@/types/connectorSettings'

export interface LiveSyncMetrics {
  syncJobsToday: number
  successfulSyncsToday: number
  failedSyncsToday: number
  articlesImportedToday: number
  averageSyncDurationMs: number
  queueSize: number
  runningJobs: number
  nextScheduledRun: string | null
  schedulerPaused: boolean
  lastSchedulerRun: string | null
}

export interface ConnectorSyncStats {
  connectorId: ConnectorId
  successRate: number
  averageRuntimeMs: number
  articlesImported: number
  failures: number
  lastSuccessAt: string | null
  lastFailureAt: string | null
  remainingQuota: string | null
  totalRuns: number
}

function isToday(dateIso: string): boolean {
  const date = new Date(dateIso)
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

export async function getLiveSyncMetrics(): Promise<LiveSyncMetrics> {
  const history = await getSyncHistory(undefined, 300)
  const todayRuns = history.filter((run) => isToday(run.startedAt))
  const successful = todayRuns.filter((run) => run.status === 'success')
  const failed = todayRuns.filter((run) => run.status === 'failed')
  const articlesImportedToday = successful.reduce(
    (sum, run) => sum + run.articlesImported,
    0,
  )

  const durations = todayRuns
    .map((run) => run.durationMs)
    .filter((value): value is number => typeof value === 'number' && value > 0)
  const averageSyncDurationMs =
    durations.length > 0
      ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
      : 0

  const snapshot = getQueueSnapshot()
  const queueStats = computeQueueStats(snapshot.jobs)
  const runtime = getSchedulerRuntimeState()

  const nextDue = history.find((run) => run.status === 'running')
  const nextScheduledRun = nextDue?.startedAt ?? runtime.lastRunAt

  return {
    syncJobsToday: todayRuns.length,
    successfulSyncsToday: successful.length,
    failedSyncsToday: failed.length,
    articlesImportedToday,
    averageSyncDurationMs,
    queueSize: queueStats.waiting + queueStats.running,
    runningJobs: queueStats.running,
    nextScheduledRun,
    schedulerPaused: runtime.paused,
    lastSchedulerRun: runtime.lastRunAt,
  }
}

export async function getConnectorSyncStats(
  connectorId: ConnectorId,
): Promise<ConnectorSyncStats> {
  const history = await getSyncHistory(connectorId, 100)
  const successes = history.filter((run) => run.status === 'success')
  const failures = history.filter((run) => run.status === 'failed')
  const durations = history
    .map((run) => run.durationMs)
    .filter((value): value is number => typeof value === 'number' && value > 0)

  const averageRuntimeMs =
    durations.length > 0
      ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
      : 0

  const articlesImported = history.reduce((sum, run) => sum + run.articlesImported, 0)
  const totalRuns = history.length
  const successRate =
    totalRuns > 0 ? Math.round((successes.length / totalRuns) * 100) : 100

  return {
    connectorId,
    successRate,
    averageRuntimeMs,
    articlesImported,
    failures: failures.length,
    lastSuccessAt: successes[0]?.finishedAt ?? successes[0]?.startedAt ?? null,
    lastFailureAt: failures[0]?.finishedAt ?? failures[0]?.startedAt ?? null,
    remainingQuota: history[0]?.remainingQuota ?? null,
    totalRuns,
  }
}

export async function getSourceSyncHistory(sourceId: string, limit = 20) {
  const history = await getSyncHistory(undefined, 200)
  return history.filter((run) => run.sourceId === sourceId).slice(0, limit)
}
