import { useEffect, useState } from 'react'
import { getLiveSyncMetrics, type LiveSyncMetrics } from '@/services/syncMetricsService'
import styles from './SyncMetricsCards.module.css'

const EMPTY_METRICS: LiveSyncMetrics = {
  syncJobsToday: 0,
  successfulSyncsToday: 0,
  failedSyncsToday: 0,
  articlesImportedToday: 0,
  averageSyncDurationMs: 0,
  queueSize: 0,
  runningJobs: 0,
  nextScheduledRun: null,
  schedulerPaused: false,
  lastSchedulerRun: null,
}

export function SyncMetricsCards() {
  const [metrics, setMetrics] = useState<LiveSyncMetrics>(EMPTY_METRICS)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const data = await getLiveSyncMetrics()
        if (active) {
          setMetrics(data)
        }
      } catch {
        if (active) {
          setMetrics(EMPTY_METRICS)
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    load()
    const intervalId = window.setInterval(load, 30_000)
    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [])

  if (isLoading) {
    return <div className={styles.loading}>Loading sync metrics…</div>
  }

  return (
    <section className={styles.grid} aria-label="Live synchronization metrics">
      <div className={styles.card}>
        <p className={styles.label}>Sync jobs today</p>
        <p className={styles.value}>{metrics.syncJobsToday}</p>
      </div>
      <div className={styles.card}>
        <p className={styles.label}>Successful syncs</p>
        <p className={styles.value}>{metrics.successfulSyncsToday}</p>
      </div>
      <div className={styles.card}>
        <p className={styles.label}>Failed syncs</p>
        <p className={styles.value}>{metrics.failedSyncsToday}</p>
      </div>
      <div className={styles.card}>
        <p className={styles.label}>Articles imported today</p>
        <p className={styles.value}>{metrics.articlesImportedToday}</p>
      </div>
      <div className={styles.card}>
        <p className={styles.label}>Avg sync duration</p>
        <p className={styles.value}>
          {metrics.averageSyncDurationMs > 0
            ? `${Math.round(metrics.averageSyncDurationMs / 1000)}s`
            : '—'}
        </p>
      </div>
      <div className={styles.card}>
        <p className={styles.label}>Queue size</p>
        <p className={styles.value}>{metrics.queueSize}</p>
      </div>
      <div className={styles.card}>
        <p className={styles.label}>Running jobs</p>
        <p className={styles.value}>{metrics.runningJobs}</p>
      </div>
      <div className={styles.card}>
        <p className={styles.label}>Scheduler</p>
        <p className={styles.valueSmall}>
          {metrics.schedulerPaused ? 'Paused' : 'Active'}
        </p>
      </div>
    </section>
  )
}
