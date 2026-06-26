import { useMemo, useState } from 'react'
import { useDataRefresh } from '@/contexts/DataRefreshContext'
import { useQueue } from '@/contexts/QueueContext'
import { useAuth } from '@/hooks/useAuth'
import { getActiveJobForSource, getQueuePosition } from '@/intelligence/queue/queueService'
import { formatIntervalLabel, formatNextSyncLabel } from '@/intelligence/scheduling/scheduleUtils'
import { formatDate } from '@/lib/format'
import {
  enqueueSourceSync,
  formatSyncStatusLabel,
  getSourceSyncJob,
} from '@/services/schedulerService'
import type { Source } from '@/types/source'
import styles from './SourceSyncPanel.module.css'

interface SourceSyncPanelProps {
  source: Source
  onSyncComplete?: () => void
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'due':
      return `${styles.statusBadge} ${styles.statusDue}`
    case 'running':
      return `${styles.statusBadge} ${styles.statusRunning}`
    case 'failed':
      return `${styles.statusBadge} ${styles.statusFailed}`
    case 'completed':
      return `${styles.statusBadge} ${styles.statusCompleted}`
    case 'manual':
      return `${styles.statusBadge} ${styles.statusManual}`
    default:
      return `${styles.statusBadge} ${styles.statusIdle}`
  }
}

export function SourceSyncPanel({ source, onSyncComplete }: SourceSyncPanelProps) {
  const { user } = useAuth()
  const { notifyDataRefresh } = useDataRefresh()
  const { snapshot, processQueue } = useQueue()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isEnqueueing, setIsEnqueueing] = useState(false)

  const queueJob = useMemo(
    () => snapshot.jobs.find((job) => job.sourceId === source.id && job.status !== 'completed') ?? getActiveJobForSource(source.id),
    [snapshot.jobs, source.id],
  )

  const job = getSourceSyncJob(source, { queueJob })
  const isQueued = queueJob?.status === 'waiting' || queueJob?.status === 'running'
  const queuePosition = queueJob?.status === 'waiting' ? getQueuePosition(queueJob.id) : 0

  const handleRunSync = async () => {
    if (!user) {
      setErrorMessage('You must be signed in to run a sync.')
      return
    }

    setIsEnqueueing(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const result = await enqueueSourceSync(source, user.id)

      if (!result.success) {
        setErrorMessage(result.errorMessage ?? 'Failed to queue sync')
        return
      }

      if (result.alreadyQueued) {
        setSuccessMessage('Sync is already queued for this source.')
      } else {
        setSuccessMessage('Sync added to queue.')
      }

      await processQueue()
      notifyDataRefresh()
      onSyncComplete?.()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to queue sync')
    } finally {
      setIsEnqueueing(false)
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h4 className={styles.title}>Sync schedule</h4>
        <span className={statusBadgeClass(job.status)}>{formatSyncStatusLabel(job.status)}</span>
      </div>

      <div className={styles.badges}>
        <span
          className={
            job.isDue
              ? `${styles.dueBadge} ${styles.dueBadgeActive}`
              : `${styles.dueBadge} ${styles.dueBadgeInactive}`
          }
        >
          {job.isDue ? 'Due' : 'Not due'}
        </span>
      </div>

      <div className={styles.grid}>
        <div className={styles.item}>
          <span className={styles.label}>Last sync</span>
          <span className={styles.value}>
            {job.lastSyncAt ? formatDate(job.lastSyncAt) : 'Not synced yet'}
          </span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Next sync</span>
          <span className={styles.value}>
            {formatNextSyncLabel(job.lastSyncAt, job.updateInterval)}
          </span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Update interval</span>
          <span className={styles.value}>{formatIntervalLabel(job.updateInterval)}</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Items collected</span>
          <span className={styles.value}>{job.itemsCollected}</span>
        </div>
      </div>

      {queueJob?.status === 'running' && (
        <div className={styles.progress} role="status" aria-live="polite">
          <div className={styles.progressBar}>
            <div className={styles.progressFill} />
          </div>
          <p className={styles.progressLabel}>Queue job running…</p>
        </div>
      )}

      {queueJob?.status === 'waiting' && queuePosition > 0 && (
        <p className={styles.queuePosition}>Queue position: #{queuePosition}</p>
      )}

      <button
        className={styles.syncButton}
        type="button"
        onClick={handleRunSync}
        disabled={isEnqueueing || isQueued}
      >
        {isEnqueueing ? 'Queueing…' : isQueued ? 'Queued' : 'Run Sync Now'}
      </button>

      {successMessage && (
        <p className={`${styles.message} ${styles.messageSuccess}`} role="status">
          {successMessage}
        </p>
      )}

      {errorMessage && (
        <p className={`${styles.message} ${styles.messageError}`} role="alert">
          {errorMessage}
        </p>
      )}

      {queueJob?.error && (
        <p className={`${styles.message} ${styles.messageError}`} role="alert">
          {queueJob.error}
        </p>
      )}
    </div>
  )
}
