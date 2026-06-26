import { getConnector } from '@/intelligence/connector/connectorRegistry'
import {
  getNextSyncAt,
  isSyncDue,
  parseUpdateInterval,
} from '@/intelligence/scheduling/scheduleUtils'
import * as connectorService from '@/services/connectorService'
import type {
  SchedulerStats,
  SyncJob,
  SyncJobRunResult,
  SyncJobStatus,
} from '@/types/syncJob'
import type { Source } from '@/types/source'

const CONNECTOR_NOT_IMPLEMENTED = 'Connector not implemented yet.'

interface SyncJobOptions {
  running?: boolean
  errorMessage?: string | null
}

function deriveSyncStatus(
  source: Source,
  options: SyncJobOptions = {},
): SyncJobStatus {
  if (options.running) {
    return 'running'
  }

  if (options.errorMessage) {
    return 'failed'
  }

  const parsed = parseUpdateInterval(source.update_interval)

  if (!parsed || parsed.kind === 'manual') {
    return 'manual'
  }

  if (!source.active || source.status !== 'enabled') {
    return 'idle'
  }

  if (isSyncDue(source.last_sync_at, source.update_interval)) {
    return 'due'
  }

  if (source.last_sync_at) {
    return 'completed'
  }

  return 'idle'
}

export function getSourceSyncJob(source: Source, options: SyncJobOptions = {}): SyncJob {
  const due = isSyncDue(source.last_sync_at, source.update_interval)
  const nextSyncAt = getNextSyncAt(source.last_sync_at, source.update_interval)

  return {
    id: `sync-${source.id}`,
    sourceId: source.id,
    sourceName: source.name,
    connectorType: source.source_type,
    status: deriveSyncStatus(source, options),
    lastSyncAt: source.last_sync_at,
    nextSyncAt,
    updateInterval: source.update_interval,
    itemsCollected: source.items_collected ?? 0,
    errorMessage: options.errorMessage ?? null,
    isDue: due,
  }
}

export function getAllSourceSyncJobs(
  sources: Source[],
  optionsBySourceId?: Record<string, SyncJobOptions>,
): SyncJob[] {
  return sources.map((source) =>
    getSourceSyncJob(source, optionsBySourceId?.[source.id]),
  )
}

export function getDueSources(sources: Source[]): Source[] {
  return sources.filter((source) => {
    const parsed = parseUpdateInterval(source.update_interval)
    if (!parsed || parsed.kind === 'manual') {
      return false
    }

    if (!source.active || source.status !== 'enabled') {
      return false
    }

    return isSyncDue(source.last_sync_at, source.update_interval)
  })
}

export function computeSchedulerStats(
  jobs: SyncJob[],
  runningCount = 0,
): SchedulerStats {
  return {
    totalSources: jobs.length,
    dueNow: jobs.filter((job) => job.status === 'due').length,
    running: runningCount > 0 ? runningCount : jobs.filter((job) => job.status === 'running').length,
    failed: jobs.filter((job) => job.status === 'failed').length,
    manualOnly: jobs.filter((job) => job.status === 'manual').length,
  }
}

export async function runManualSync(source: Source, userId: string): Promise<SyncJobRunResult> {
  const connector = getConnector(source.source_type)

  if (!connector.implemented) {
    return { success: false, errorMessage: CONNECTOR_NOT_IMPLEMENTED }
  }

  try {
    const result = await connectorService.importArticlesFromFeed(source, userId)

    return {
      success: true,
      imported: result.imported,
      skipped: result.skipped,
      failed: result.failed,
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Sync failed',
    }
  }
}

export function formatSyncStatusLabel(status: SyncJobStatus): string {
  switch (status) {
    case 'idle':
      return 'Idle'
    case 'due':
      return 'Due'
    case 'running':
      return 'Running'
    case 'completed':
      return 'Completed'
    case 'failed':
      return 'Failed'
    case 'manual':
      return 'Manual'
    default:
      return status
  }
}
