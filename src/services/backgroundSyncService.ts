import { queueManager } from '@/intelligence/queue/QueueManager'
import { getActiveJobForSource } from '@/intelligence/queue/queueService'
import { enqueueSourceSync, getDueSources } from '@/services/schedulerService'
import * as sourceService from '@/services/sourceService'

const PAUSED_KEY = 'mx_scheduler_paused'
const LAST_RUN_KEY = 'mx_scheduler_last_run'
const JOBS_TODAY_KEY = 'mx_scheduler_jobs_today'
const MAX_CONCURRENT_KEY = 'mx_scheduler_max_concurrent'

export interface SchedulerRuntimeState {
  paused: boolean
  lastRunAt: string | null
  jobsToday: number
  maxConcurrentJobs: number
}

function readJobsToday(): { date: string; count: number } {
  try {
    const raw = localStorage.getItem(JOBS_TODAY_KEY)
    if (!raw) {
      return { date: new Date().toDateString(), count: 0 }
    }
    return JSON.parse(raw) as { date: string; count: number }
  } catch {
    return { date: new Date().toDateString(), count: 0 }
  }
}

function incrementJobsToday(): number {
  const today = new Date().toDateString()
  const current = readJobsToday()
  const count = current.date === today ? current.count + 1 : 1
  localStorage.setItem(JOBS_TODAY_KEY, JSON.stringify({ date: today, count }))
  return count
}

export function getSchedulerRuntimeState(): SchedulerRuntimeState {
  const paused = localStorage.getItem(PAUSED_KEY) === 'true'
  const lastRunAt = localStorage.getItem(LAST_RUN_KEY)
  const jobsRecord = readJobsToday()
  const jobsToday =
    jobsRecord.date === new Date().toDateString() ? jobsRecord.count : 0
  const maxConcurrent = Number(localStorage.getItem(MAX_CONCURRENT_KEY) ?? '2')

  return {
    paused,
    lastRunAt,
    jobsToday,
    maxConcurrentJobs: maxConcurrent >= 1 && maxConcurrent <= 5 ? maxConcurrent : 2,
  }
}

export function setSchedulerPaused(paused: boolean): void {
  localStorage.setItem(PAUSED_KEY, paused ? 'true' : 'false')
}

export function setMaxConcurrentJobs(value: number): void {
  const clamped = Math.min(Math.max(value, 1), 5)
  localStorage.setItem(MAX_CONCURRENT_KEY, String(clamped))
  queueManager.setMaxConcurrentJobs(clamped)
}

export async function runSchedulerTick(userId: string): Promise<{
  enqueued: number
  skippedPaused: boolean
}> {
  const state = getSchedulerRuntimeState()
  if (state.paused) {
    return { enqueued: 0, skippedPaused: true }
  }

  localStorage.setItem(LAST_RUN_KEY, new Date().toISOString())

  const sources = await sourceService.getSources()
  const due = getDueSources(sources)
  let enqueued = 0

  for (const source of due) {
    if (!getActiveJobForSource(source.id)) {
      const result = await enqueueSourceSync(source, userId)
      if (result.success && !result.alreadyQueued) {
        enqueued += 1
        incrementJobsToday()
      }
    }
  }

  await queueManager.processQueue()

  return { enqueued, skippedPaused: false }
}

export async function runAllDueSourcesNow(userId: string): Promise<number> {
  const sources = await sourceService.getSources()
  const due = getDueSources(sources)
  let enqueued = 0

  for (const source of due) {
    if (!getActiveJobForSource(source.id)) {
      const result = await enqueueSourceSync(source, userId)
      if (result.success) {
        enqueued += 1
        incrementJobsToday()
      }
    }
  }

  await queueManager.processQueue()
  localStorage.setItem(LAST_RUN_KEY, new Date().toISOString())
  return enqueued
}
