import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDataRefresh } from '@/contexts/DataRefreshContext'
import { useQueue } from '@/contexts/QueueContext'
import { useAuth } from '@/hooks/useAuth'
import {
  cancelJob,
  formatDurationMs,
  getJobDurationMs,
  retryJob,
} from '@/intelligence/queue/queueService'
import { queueManager } from '@/intelligence/queue/QueueManager'
import type { QueueJob } from '@/intelligence/queue/types'
import { formatDate } from '@/lib/format'
import { sourceDetailPath } from '@/lib/constants'
import styles from './QueueJobCard.module.css'

interface QueueJobCardProps {
  job: QueueJob
  queuePosition?: number
}

function statusClass(status: QueueJob['status']): string {
  switch (status) {
    case 'waiting':
      return `${styles.status} ${styles.statusWaiting}`
    case 'running':
      return `${styles.status} ${styles.statusRunning}`
    case 'completed':
      return `${styles.status} ${styles.statusCompleted}`
    case 'failed':
      return `${styles.status} ${styles.statusFailed}`
    case 'cancelled':
      return `${styles.status} ${styles.statusCancelled}`
    default:
      return styles.status
  }
}

export function QueueJobCard({ job, queuePosition = 0 }: QueueJobCardProps) {
  const { user } = useAuth()
  const { notifyDataRefresh } = useDataRefresh()
  const { refresh, processQueue } = useQueue()
  const [showDetails, setShowDetails] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isActing, setIsActing] = useState(false)

  const duration = formatDurationMs(getJobDurationMs(job))

  const handleRetry = async () => {
    if (!user) {
      setActionError('You must be signed in to retry jobs.')
      return
    }

    setIsActing(true)
    setActionError(null)
    setActionMessage(null)

    try {
      retryJob(job.id)
      await processQueue()
      setActionMessage('Job re-queued for retry.')
      refresh()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to retry job')
    } finally {
      setIsActing(false)
    }
  }

  const handleCancel = async () => {
    setIsActing(true)
    setActionError(null)
    setActionMessage(null)

    try {
      cancelJob(job.id)
      setActionMessage('Job cancelled.')
      refresh()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to cancel job')
    } finally {
      setIsActing(false)
    }
  }

  const handleProcessQueue = async () => {
    setIsActing(true)
    try {
      await queueManager.processNext()
      notifyDataRefresh()
      refresh()
    } finally {
      setIsActing(false)
    }
  }

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <div>
          <Link to={sourceDetailPath(job.sourceId)} className={styles.sourceLink}>
            {job.sourceName}
          </Link>
          <p className={styles.connector}>{job.connectorType}</p>
        </div>
        <span className={statusClass(job.status)}>{job.status}</span>
      </div>

      {job.status === 'running' && (
        <div className={styles.progress} role="status" aria-live="polite">
          <div className={styles.progressBar}>
            <div className={styles.progressFill} />
          </div>
          <p className={styles.progressLabel}>Sync in progress…</p>
        </div>
      )}

      {job.status === 'waiting' && queuePosition > 0 && (
        <p className={styles.queuePosition}>Queue position: #{queuePosition}</p>
      )}

      <div className={styles.metaGrid}>
        <div>
          <span className={styles.metaLabel}>Priority</span>
          <span className={styles.metaValue}>{job.priority}</span>
        </div>
        <div>
          <span className={styles.metaLabel}>Attempts</span>
          <span className={styles.metaValue}>
            {job.attempts}/{job.maxAttempts}
          </span>
        </div>
        <div>
          <span className={styles.metaLabel}>Items collected</span>
          <span className={styles.metaValue}>{job.itemsCollected}</span>
        </div>
        <div>
          <span className={styles.metaLabel}>Duration</span>
          <span className={styles.metaValue}>{duration}</span>
        </div>
      </div>

      <div className={styles.timestamps}>
        <span>Created: {formatDate(job.createdAt)}</span>
        {job.startedAt && <span>Started: {formatDate(job.startedAt)}</span>}
        {job.completedAt && <span>Completed: {formatDate(job.completedAt)}</span>}
      </div>

      {job.error && (
        <p className={styles.error} role="alert">{job.error}</p>
      )}

      {showDetails && (
        <div className={styles.details}>
          <p><strong>Job ID:</strong> {job.id}</p>
          <p><strong>Source ID:</strong> {job.sourceId}</p>
          <p><strong>Connector:</strong> {job.connectorType}</p>
          <p><strong>Status:</strong> {job.status}</p>
          <p><strong>Priority:</strong> {job.priority}</p>
          <p><strong>Attempts:</strong> {job.attempts} of {job.maxAttempts}</p>
          <p><strong>Items collected:</strong> {job.itemsCollected}</p>
        </div>
      )}

      <div className={styles.actions}>
        {(job.status === 'failed' || job.status === 'cancelled') && (
          <button className={styles.actionButton} type="button" onClick={handleRetry} disabled={isActing}>
            Retry
          </button>
        )}
        {job.status === 'waiting' && (
          <button className={styles.actionButton} type="button" onClick={handleCancel} disabled={isActing}>
            Cancel
          </button>
        )}
        {job.status === 'running' && (
          <button className={styles.actionButton} type="button" onClick={handleProcessQueue} disabled={isActing}>
            Refresh status
          </button>
        )}
        <button
          className={styles.actionButton}
          type="button"
          onClick={() => setShowDetails((value) => !value)}
        >
          {showDetails ? 'Hide details' : 'View details'}
        </button>
      </div>

      {actionMessage && <p className={styles.messageSuccess}>{actionMessage}</p>}
      {actionError && <p className={styles.messageError} role="alert">{actionError}</p>}
    </article>
  )
}
