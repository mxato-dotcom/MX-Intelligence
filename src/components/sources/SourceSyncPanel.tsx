import { useState } from 'react'
import { useDataRefresh } from '@/contexts/DataRefreshContext'
import { useAuth } from '@/hooks/useAuth'
import { formatIntervalLabel, formatNextSyncLabel } from '@/intelligence/scheduling/scheduleUtils'
import { formatDate } from '@/lib/format'
import {
  formatSyncStatusLabel,
  getSourceSyncJob,
  runManualSync,
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
  const [isRunning, setIsRunning] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const job = getSourceSyncJob(source, {
    running: isRunning,
    errorMessage: errorMessage && !successMessage ? errorMessage : null,
  })

  const handleRunSync = async () => {
    if (!user) {
      setErrorMessage('You must be signed in to run a sync.')
      return
    }

    setIsRunning(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const result = await runManualSync(source, user.id)

      if (!result.success) {
        setErrorMessage(result.errorMessage ?? 'Sync failed')
        return
      }

      setSuccessMessage(
        `Sync complete — imported ${result.imported ?? 0}, skipped ${result.skipped ?? 0}, failed ${result.failed ?? 0}.`,
      )
      notifyDataRefresh()
      onSyncComplete?.()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setIsRunning(false)
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

      <button
        className={styles.syncButton}
        type="button"
        onClick={handleRunSync}
        disabled={isRunning}
      >
        {isRunning ? 'Syncing…' : 'Run Sync Now'}
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
    </div>
  )
}
