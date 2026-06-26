import { useEffect, useState } from 'react'
import { QueueJobCard } from '@/components/queue/QueueJobCard'
import { PageContainer } from '@/components/layout/PageContainer'
import { useQueue } from '@/contexts/QueueContext'
import { clearCompleted, formatDurationMs, getQueuePosition } from '@/intelligence/queue/queueService'
import type { QueueJobStatus } from '@/intelligence/queue/types'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
import { getSyncHistory, getSyncLogs } from '@/services/syncHistoryService'
import type { ConnectorSyncHistoryRecord, ConnectorSyncLogRecord } from '@/types/syncHistory'
import styles from './QueuePage.module.css'

type QueueFilter = 'all' | QueueJobStatus

const FILTER_OPTIONS: { id: QueueFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'running', label: 'Running' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed' },
  { id: 'cancelled', label: 'Cancelled' },
]

export function QueuePage() {
  const { snapshot, stats, refresh } = useQueue()
  const [filter, setFilter] = useState<QueueFilter>('all')
  const [syncHistory, setSyncHistory] = useState<ConnectorSyncHistoryRecord[]>([])
  const [syncLogs, setSyncLogs] = useState<ConnectorSyncLogRecord[]>([])

  const filteredJobs = filter === 'all'
    ? snapshot.jobs
    : snapshot.jobs.filter((job) => job.status === filter)

  useEffect(() => {
    let active = true

    async function loadSyncData() {
      try {
        const [history, logs] = await Promise.all([getSyncHistory(undefined, 20), getSyncLogs(50)])
        if (active) {
          setSyncHistory(history)
          setSyncLogs(logs)
        }
      } catch {
        // Sync history is optional until migration is applied
      }
    }

    loadSyncData()
    return () => {
      active = false
    }
  }, [snapshot.jobs.length, stats.completed])

  const handleClearCompleted = () => {
    clearCompleted()
    refresh()
  }

  return (
    <PageContainer
      title="Job Queue"
      description="Monitor connector sync jobs, execution history, and structured connector logs."
      actions={
        <button className={styles.clearButton} type="button" onClick={handleClearCompleted}>
          Clear completed
        </button>
      }
    >
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total Jobs</p>
          <p className={styles.statValue}>{stats.totalJobs}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Waiting</p>
          <p className={styles.statValue}>{stats.waiting}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Running</p>
          <p className={styles.statValue}>{stats.running}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Completed</p>
          <p className={styles.statValue}>{stats.completed}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Failed</p>
          <p className={styles.statValue}>{stats.failed}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Average Duration</p>
          <p className={styles.statValue}>{formatDurationMs(stats.averageDurationMs)}</p>
        </div>
      </div>

      <div className={styles.filters}>
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.id}
            className={
              filter === option.id
                ? `${styles.filterButton} ${styles.filterButtonActive}`
                : styles.filterButton
            }
            type="button"
            onClick={() => setFilter(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {filteredJobs.length === 0 ? (
        <div className={styles.stateBox}>No jobs in this queue state.</div>
      ) : (
        <div className={styles.grid}>
          {filteredJobs.map((job) => (
            <QueueJobCard
              key={job.id}
              job={job}
              queuePosition={job.status === 'waiting' ? getQueuePosition(job.id) : 0}
            />
          ))}
        </div>
      )}

      {syncHistory.length > 0 && (
        <section className={styles.logSection}>
          <h2 className={styles.logTitle}>Recent sync history</h2>
          <ul className={styles.logList}>
            {syncHistory.map((run) => (
              <li key={run.id} className={styles.logRow}>
                <span className={styles.logConnector}>{run.connectorId}</span>
                <span className={styles.logStatus}>{run.status}</span>
                <span>{run.articlesImported} imported</span>
                <span>{run.duplicates} duplicates</span>
                <span>{run.durationMs ? formatDurationMs(run.durationMs) : '—'}</span>
                <span>{formatRelativeTime(run.startedAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {syncLogs.length > 0 && (
        <section className={styles.logSection}>
          <h2 className={styles.logTitle}>Connector logs</h2>
          <ul className={styles.logList}>
            {syncLogs.slice(0, 25).map((log) => (
              <li key={log.id} className={styles.logRow}>
                <span className={styles.logConnector}>{log.connectorId}</span>
                <span>{log.message ?? log.errorMessage ?? '—'}</span>
                <span>{log.httpStatus ?? '—'}</span>
                <span>{log.durationMs ? `${log.durationMs} ms` : '—'}</span>
                <span>{formatRelativeTime(log.requestAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PageContainer>
  )
}
