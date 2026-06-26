import type {
  EnqueueJobInput,
  EnqueueResult,
  QueueJob,
  QueueJobExecutionMetrics,
  QueueJobPriority,
  QueueSnapshot,
  QueueStats,
} from '@/intelligence/queue/types'

const DEFAULT_MAX_ATTEMPTS = 3

const jobs = new Map<string, QueueJob>()
const userIdsByJob = new Map<string, string>()
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) {
    listener()
  }
}

function generateJobId(): string {
  return `job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function priorityWeight(priority: QueueJobPriority): number {
  switch (priority) {
    case 'high':
      return 3
    case 'medium':
      return 2
    case 'low':
      return 1
    default:
      return 2
  }
}

function sortWaitingJobs(waiting: QueueJob[]): QueueJob[] {
  return [...waiting].sort((left, right) => {
    const priorityDiff = priorityWeight(right.priority) - priorityWeight(left.priority)
    if (priorityDiff !== 0) {
      return priorityDiff
    }

    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  })
}

function getJobOrThrow(id: string): QueueJob {
  const job = jobs.get(id)
  if (!job) {
    throw new Error('Queue job not found')
  }
  return job
}

export function subscribeQueue(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getJobUserId(jobId: string): string | undefined {
  return userIdsByJob.get(jobId)
}

export function getActiveJobForSource(sourceId: string): QueueJob | undefined {
  for (const job of jobs.values()) {
    if (job.sourceId === sourceId && (job.status === 'waiting' || job.status === 'running')) {
      return job
    }
  }
  return undefined
}

export function enqueue(input: EnqueueJobInput): EnqueueResult {
  const existing = getActiveJobForSource(input.sourceId)
  if (existing) {
    return {
      success: true,
      job: existing,
      alreadyQueued: true,
    }
  }

  const job: QueueJob = {
    id: generateJobId(),
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    connectorType: input.connectorType,
    status: 'waiting',
    priority: input.priority ?? 'medium',
    createdAt: new Date().toISOString(),
    attempts: 0,
    maxAttempts: input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
    itemsCollected: 0,
  }

  jobs.set(job.id, job)
  userIdsByJob.set(job.id, input.userId)
  notify()

  return { success: true, job }
}

export function enqueueMany(inputs: EnqueueJobInput[]): QueueJob[] {
  const created: QueueJob[] = []

  for (const input of inputs) {
    const result = enqueue(input)
    if (result.job) {
      created.push(result.job)
    }
  }

  return created
}

export function startJob(id: string): QueueJob {
  const job = getJobOrThrow(id)
  job.status = 'running'
  job.startedAt = new Date().toISOString()
  job.error = undefined
  notify()
  return job
}

export function completeJob(
  id: string,
  itemsCollected: number,
  metrics?: QueueJobExecutionMetrics,
): QueueJob {
  const job = getJobOrThrow(id)
  job.status = 'completed'
  job.completedAt = new Date().toISOString()
  job.itemsCollected = itemsCollected
  job.error = undefined
  if (metrics) {
    job.metrics = { ...job.metrics, ...metrics }
  }
  notify()
  return job
}

export function failJob(id: string, error: string): QueueJob {
  const job = getJobOrThrow(id)
  job.attempts += 1
  job.status = 'failed'
  job.completedAt = new Date().toISOString()
  job.error = error
  notify()
  return job
}

export function cancelJob(id: string): QueueJob {
  const job = getJobOrThrow(id)

  if (job.status !== 'waiting') {
    throw new Error('Only waiting jobs can be cancelled')
  }

  job.status = 'cancelled'
  job.completedAt = new Date().toISOString()
  notify()
  return job
}

export function requeueJobForRetry(id: string): QueueJob {
  const job = getJobOrThrow(id)

  const active = getActiveJobForSource(job.sourceId)
  if (active) {
    throw new Error('Source already has an active queue job')
  }

  job.status = 'waiting'
  job.startedAt = undefined
  job.completedAt = undefined
  job.error = undefined
  job.itemsCollected = 0
  notify()
  return job
}

export function retryJob(id: string): QueueJob {
  const job = getJobOrThrow(id)

  if (job.status !== 'failed' && job.status !== 'cancelled') {
    throw new Error('Only failed or cancelled jobs can be retried')
  }

  if (job.attempts >= job.maxAttempts) {
    throw new Error('Maximum retry attempts reached')
  }

  const active = getActiveJobForSource(job.sourceId)
  if (active) {
    throw new Error('Source already has an active queue job')
  }

  job.status = 'waiting'
  job.startedAt = undefined
  job.completedAt = undefined
  job.error = undefined
  job.itemsCollected = 0
  notify()
  return job
}

export function clearCompleted(): number {
  let removed = 0

  for (const [id, job] of jobs.entries()) {
    if (job.status === 'completed') {
      jobs.delete(id)
      userIdsByJob.delete(id)
      removed += 1
    }
  }

  if (removed > 0) {
    notify()
  }

  return removed
}

export function getQueue(): QueueJob[] {
  return [...jobs.values()].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  )
}

export function getWaiting(): QueueJob[] {
  return sortWaitingJobs(getQueue().filter((job) => job.status === 'waiting'))
}

export function getRunning(): QueueJob[] {
  return getQueue().filter((job) => job.status === 'running')
}

export function getFailed(): QueueJob[] {
  return getQueue().filter((job) => job.status === 'failed')
}

export function getCompleted(): QueueJob[] {
  return getQueue().filter((job) => job.status === 'completed')
}

export function getCancelled(): QueueJob[] {
  return getQueue().filter((job) => job.status === 'cancelled')
}

export function getQueuePosition(jobId: string): number {
  const waiting = getWaiting()
  const index = waiting.findIndex((job) => job.id === jobId)
  return index === -1 ? 0 : index + 1
}

export function getQueueSnapshot(): QueueSnapshot {
  const all = getQueue()
  return {
    jobs: all,
    waiting: getWaiting(),
    running: getRunning(),
    completed: getCompleted(),
    failed: getFailed(),
    cancelled: getCancelled(),
  }
}

export function computeQueueStats(jobs: QueueJob[]): QueueStats {
  const completed = jobs.filter((job) => job.status === 'completed')
  const durations = completed
    .map((job) => {
      if (!job.startedAt || !job.completedAt) {
        return null
      }
      const duration = new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()
      return duration >= 0 ? duration : null
    })
    .filter((value): value is number => value !== null)

  const averageDurationMs =
    durations.length === 0
      ? 0
      : Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)

  return {
    totalJobs: jobs.length,
    waiting: jobs.filter((job) => job.status === 'waiting').length,
    running: jobs.filter((job) => job.status === 'running').length,
    completed: completed.length,
    failed: jobs.filter((job) => job.status === 'failed').length,
    cancelled: jobs.filter((job) => job.status === 'cancelled').length,
    averageDurationMs,
  }
}

export function getJobDurationMs(job: QueueJob): number | null {
  if (job.status === 'running' && job.startedAt) {
    return Date.now() - new Date(job.startedAt).getTime()
  }

  if (job.startedAt && job.completedAt) {
    return new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()
  }

  return null
}

export function formatDurationMs(durationMs: number | null): string {
  if (durationMs === null) {
    return '—'
  }

  if (durationMs < 1000) {
    return `${durationMs}ms`
  }

  const seconds = Math.round(durationMs / 1000)
  if (seconds < 60) {
    return `${seconds}s`
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}
