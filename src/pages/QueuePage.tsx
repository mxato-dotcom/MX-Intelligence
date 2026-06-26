import { useMemo, useState } from 'react'
import { QueueJobCard } from '@/components/queue/QueueJobCard'
import { PageContainer } from '@/components/layout/PageContainer'
import { useQueue } from '@/contexts/QueueContext'
import { clearCompleted, formatDurationMs, getQueuePosition } from '@/intelligence/queue/queueService'
import type { QueueJobStatus } from '@/intelligence/queue/types'
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

  const filteredJobs = useMemo(() => {
    if (filter === 'all') {
      return snapshot.jobs
    }
    return snapshot.jobs.filter((job) => job.status === filter)
  }, [snapshot.jobs, filter])

  const handleClearCompleted = () => {
    clearCompleted()
    refresh()
  }

  return (
    <PageContainer
      title="Job Queue"
      description="Monitor connector sync jobs, queue positions, and manual retry controls."
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
    </PageContainer>
  )
}
