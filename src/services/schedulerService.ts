import { getConnector } from '@/intelligence/connector/connectorRegistry'
import { queueManager } from '@/intelligence/queue/QueueManager'
import {
  enqueue as enqueueQueueJob,
  getActiveJobForSource,
} from '@/intelligence/queue/queueService'
import type { EnqueueResult, QueueJob, QueueJobPriority } from '@/intelligence/queue/types'
import {
  getNextSyncAt,
  isSyncDue,
  parseUpdateInterval,
} from '@/intelligence/scheduling/scheduleUtils'
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
  queueJob?: QueueJob | null
}

function mapSourcePriority(priority: string): QueueJobPriority {
  if (priority === 'high') {
    return 'high'
  }
  if (priority === 'low') {
    return 'low'
  }
  return 'medium'
}

function deriveSyncStatus(
  source: Source,
  options: SyncJobOptions = {},
): SyncJobStatus {
  if (options.queueJob?.status === 'running' || options.running) {
    return 'running'
  }

  if (options.queueJob?.status === 'waiting') {
    return 'running'
  }

  if (options.errorMessage || options.queueJob?.status === 'failed') {
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
  const queueJob = options.queueJob ?? getActiveJobForSource(source.id)
  const due = isSyncDue(source.last_sync_at, source.update_interval)
  const nextSyncAt = getNextSyncAt(source.last_sync_at, source.update_interval)

  return {
    id: `sync-${source.id}`,
    sourceId: source.id,
    sourceName: source.name,
    connectorType: source.source_type,
    status: deriveSyncStatus(source, { ...options, queueJob }),
    lastSyncAt: source.last_sync_at,
    nextSyncAt,
    updateInterval: source.update_interval,
    itemsCollected: source.items_collected ?? 0,
    errorMessage: options.errorMessage ?? queueJob?.error ?? null,
    isDue: due,
  }
}

export function getAllSourceSyncJobs(
  sources: Source[],
  optionsBySourceId?: Record<string, SyncJobOptions>,
): SyncJob[] {
  return sources.map((source) => {
    const options = optionsBySourceId?.[source.id] ?? {}
    const queueJob = getActiveJobForSource(source.id)
    return getSourceSyncJob(source, { ...options, queueJob })
  })
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
    running:
      runningCount > 0
        ? runningCount
        : jobs.filter((job) => job.status === 'running').length,
    failed: jobs.filter((job) => job.status === 'failed').length,
    manualOnly: jobs.filter((job) => job.status === 'manual').length,
  }
}

export async function enqueueSourceSync(source: Source, userId: string): Promise<EnqueueResult> {
  const connector = getConnector(source.source_type)

  if (!connector.implemented) {
    return { success: false, errorMessage: CONNECTOR_NOT_IMPLEMENTED }
  }

  const result = enqueueQueueJob({
    sourceId: source.id,
    sourceName: source.name,
    connectorType: source.source_type,
    priority: mapSourcePriority(source.priority),
    userId,
  })

  if (result.job) {
    await queueManager.processNext()
  }

  return result
}

/** @deprecated Use enqueueSourceSync — enqueues a sync job instead of importing directly. */
export async function runManualSync(source: Source, userId: string): Promise<SyncJobRunResult> {
  const result = await enqueueSourceSync(source, userId)

  if (!result.success) {
    return { success: false, errorMessage: result.errorMessage }
  }

  if (result.alreadyQueued) {
    return {
      success: true,
      imported: 0,
      skipped: 0,
      failed: 0,
    }
  }

  return {
    success: true,
    imported: 0,
    skipped: 0,
    failed: 0,
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
