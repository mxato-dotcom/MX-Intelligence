export type QueueJobStatus =
  | 'waiting'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type QueueJobPriority = 'low' | 'medium' | 'high'

export interface QueueJobExecutionMetrics {
  articlesDownloaded?: number
  articlesImported?: number
  duplicates?: number
  entitiesExtracted?: number
  briefGenerated?: boolean
  timelineUpdated?: boolean
  graphUpdated?: boolean
  alertsEvaluated?: number
  httpStatus?: number | null
  providerResponse?: string | null
  syncHistoryId?: string | null
}

export interface QueueJob {
  id: string
  sourceId: string
  sourceName: string
  connectorType: string
  status: QueueJobStatus
  priority: QueueJobPriority
  createdAt: string
  startedAt?: string
  completedAt?: string
  attempts: number
  maxAttempts: number
  itemsCollected: number
  error?: string
  metrics?: QueueJobExecutionMetrics
}

export interface EnqueueJobInput {
  sourceId: string
  sourceName: string
  connectorType: string
  priority?: QueueJobPriority
  userId: string
  maxAttempts?: number
}

export interface QueueSnapshot {
  jobs: QueueJob[]
  waiting: QueueJob[]
  running: QueueJob[]
  completed: QueueJob[]
  failed: QueueJob[]
  cancelled: QueueJob[]
}

export interface QueueStats {
  totalJobs: number
  waiting: number
  running: number
  completed: number
  failed: number
  cancelled: number
  averageDurationMs: number
}

export interface EnqueueResult {
  success: boolean
  job?: QueueJob
  errorMessage?: string
  alreadyQueued?: boolean
}

export type SyncNotificationKind =
  | 'sync_started'
  | 'sync_completed'
  | 'sync_failed'
  | 'retry_started'
  | 'retry_successful'
  | 'retry_failed'
  | 'provider_offline'
  | 'rate_limited'
  | 'auth_failed'

export interface SyncNotificationEvent {
  kind: SyncNotificationKind
  jobId: string
  sourceName: string
  message?: string
}
