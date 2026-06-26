import { getConnector } from '@/intelligence/connector/connectorRegistry'
import {
  completeJob,
  failJob,
  getJobUserId,
  getRunning,
  getWaiting,
  startJob,
} from '@/intelligence/queue/queueService'
import * as connectorService from '@/services/connectorService'
import * as sourceService from '@/services/sourceService'
import { trustScoreEngine } from '@/intelligence/scoring/TrustScoreEngine'

const CONNECTOR_NOT_IMPLEMENTED = 'Connector not implemented yet.'

type RefreshHandler = () => void

class QueueManager {
  private isProcessing = false
  private refreshHandler: RefreshHandler | undefined

  setRefreshHandler(handler: RefreshHandler): void {
    this.refreshHandler = handler
  }

  async processNext(): Promise<void> {
    if (this.isProcessing) {
      return
    }

    if (getRunning().length > 0) {
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

    this.isProcessing = true
    startJob(nextJob.id)

    try {
      const source = await sourceService.getSourceById(nextJob.sourceId)
      if (!source) {
        throw new Error('Source not found')
      }

      const connector = getConnector(source.source_type)
      if (!connector.implemented) {
        throw new Error(CONNECTOR_NOT_IMPLEMENTED)
      }

      const result = await connectorService.importArticlesFromFeed(source, userId)
      completeJob(nextJob.id, result.imported)
      this.refreshHandler?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed'
      failJob(nextJob.id, message)

      try {
        const failedSource = await sourceService.getSourceById(nextJob.sourceId)
        if (failedSource) {
          await trustScoreEngine.recordFailedSync(failedSource)
        }
      } catch {
        // Scoring failure should not block queue processing
      }
    } finally {
      this.isProcessing = false
      await this.processNext()
    }
  }
}

export const queueManager = new QueueManager()
