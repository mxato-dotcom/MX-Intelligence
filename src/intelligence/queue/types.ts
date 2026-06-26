export type QueueJobStatus =
  | 'waiting'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type QueueJobPriority = 'low' | 'medium' | 'high'

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
