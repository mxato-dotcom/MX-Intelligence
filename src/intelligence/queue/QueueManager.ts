import { getConnector } from '@/intelligence/connector/connectorRegistry'
import {
  completeJob,
  failJob,
  getJobUserId,
  getRunning,
  getWaiting,
  requeueJobForRetry,
  startJob,
} from '@/intelligence/queue/queueService'
import type { SyncNotificationEvent } from '@/intelligence/queue/types'
import { executeSyncJob } from '@/services/jobExecutionService'
import {
  classifySyncError,
  getRetryDelayMs,
  shouldAutoRetry,
} from '@/services/retryService'
import * as sourceService from '@/services/sourceService'
import { trustScoreEngine } from '@/intelligence/scoring/TrustScoreEngine'

const CONNECTOR_NOT_IMPLEMENTED = 'Connector not implemented yet.'

type RefreshHandler = () => void
type NotificationHandler = (event: SyncNotificationEvent) => void

class QueueManager {
  private maxConcurrentJobs = 2
  private activeWorkers = 0
  private refreshHandler: RefreshHandler | undefined
  private notificationHandler: NotificationHandler | undefined
  private retryTimers = new Map<string, number>()

  setRefreshHandler(handler: RefreshHandler): void {
    this.refreshHandler = handler
  }

  setNotificationHandler(handler: NotificationHandler): void {
    this.notificationHandler = handler
  }

  setMaxConcurrentJobs(value: number): void {
    this.maxConcurrentJobs = Math.min(Math.max(value, 1), 5)
  }

  private emit(event: SyncNotificationEvent): void {
    this.notificationHandler?.(event)
  }

  async processQueue(): Promise<void> {
    while (getRunning().length < this.maxConcurrentJobs && getWaiting().length > 0) {
      await this.processNext()
    }
  }

  async processNext(): Promise<void> {
    if (getRunning().length >= this.maxConcurrentJobs) {
      return
    }

    const waiting = getWaiting()
    if (waiting.length === 0) {
      return
    }

    const nextJob = waiting[0]
    const userId = getJobUserId(nextJob.id)

    if (!userId) {
      failJob(nextJob.id, 'Missing user context for queue job')
      await this.processNext()
      return
    }

    this.activeWorkers += 1
    startJob(nextJob.id)
    this.emit({
      kind: 'sync_started',
      jobId: nextJob.id,
      sourceName: nextJob.sourceName,
    })

    try {
      const source = await sourceService.getSourceById(nextJob.sourceId)
      if (!source) {
        throw new Error('Source not found')
      }

      if (!source.active || source.status !== 'enabled') {
        throw new Error('Source is disabled')
      }

      const connector = getConnector(source.source_type)
      if (!connector.implemented) {
        throw new Error(CONNECTOR_NOT_IMPLEMENTED)
      }

      const result = await executeSyncJob(source, userId, { jobId: nextJob.id })

      completeJob(nextJob.id, result.imported, {
        articlesDownloaded: result.downloaded,
        articlesImported: result.imported,
        duplicates: result.skipped,
        entitiesExtracted: result.entitiesExtracted,
        briefGenerated: result.briefGenerated,
        timelineUpdated: result.timelineUpdated,
        graphUpdated: result.graphUpdated,
        alertsEvaluated: result.alertsEvaluated,
        httpStatus: result.httpStatus,
        syncHistoryId: result.syncHistoryId,
      })

      this.emit({
        kind: 'sync_completed',
        jobId: nextJob.id,
        sourceName: nextJob.sourceName,
        message: `${result.imported} articles imported`,
      })

      this.refreshHandler?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed'
      const failedJob = failJob(nextJob.id, message)
      const errorKind = classifySyncError(message)

      if (errorKind === 'rate_limited') {
        this.emit({ kind: 'rate_limited', jobId: nextJob.id, sourceName: nextJob.sourceName, message })
      } else if (errorKind === 'auth_failed') {
        this.emit({ kind: 'auth_failed', jobId: nextJob.id, sourceName: nextJob.sourceName, message })
      } else if (errorKind === 'provider_offline') {
        this.emit({ kind: 'provider_offline', jobId: nextJob.id, sourceName: nextJob.sourceName, message })
      } else {
        this.emit({ kind: 'sync_failed', jobId: nextJob.id, sourceName: nextJob.sourceName, message })
      }

      try {
        const failedSource = await sourceService.getSourceById(nextJob.sourceId)
        if (failedSource) {
          await trustScoreEngine.recordFailedSync(failedSource)
        }
      } catch {
        // Scoring failure should not block queue processing
      }

      if (shouldAutoRetry(failedJob.attempts, failedJob.maxAttempts)) {
        const delayMs = getRetryDelayMs(failedJob.attempts - 1)
        if (delayMs !== null) {
          this.emit({
            kind: 'retry_started',
            jobId: nextJob.id,
            sourceName: nextJob.sourceName,
            message: `Retry in ${Math.round(delayMs / 1000)}s`,
          })

          const existingTimer = this.retryTimers.get(nextJob.id)
          if (existingTimer) {
            window.clearTimeout(existingTimer)
          }

          const timerId = window.setTimeout(async () => {
            this.retryTimers.delete(nextJob.id)
            try {
              requeueJobForRetry(nextJob.id)
              await this.processQueue()
            } catch {
              this.emit({
                kind: 'retry_failed',
                jobId: nextJob.id,
                sourceName: nextJob.sourceName,
              })
            }
          }, delayMs)

          this.retryTimers.set(nextJob.id, timerId)
        }
      }
    } finally {
      this.activeWorkers = Math.max(0, this.activeWorkers - 1)
      await this.processNext()
    }
  }
}

export const queueManager = new QueueManager()
