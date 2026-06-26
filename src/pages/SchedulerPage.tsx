import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageContainer } from '@/components/layout/PageContainer'
import { SourceTrustDisplay } from '@/components/sources/SourceTrustDisplay'
import { useQueue } from '@/contexts/QueueContext'
import { useAuth } from '@/hooks/useAuth'
import { useSources } from '@/hooks/useSources'
import { getActiveJobForSource } from '@/intelligence/queue/queueService'
import { formatIntervalLabel, formatNextSyncLabel } from '@/intelligence/scheduling/scheduleUtils'
import { formatDate } from '@/lib/format'
import { sourceDetailPath } from '@/lib/constants'
import {
  getSchedulerRuntimeState,
  runAllDueSourcesNow,
  setMaxConcurrentJobs,
  setSchedulerPaused,
} from '@/services/backgroundSyncService'
import {
  computeSchedulerStats,
  enqueueSourceSync,
  formatSyncStatusLabel,
  getAllSourceSyncJobs,
} from '@/services/schedulerService'
import type { SyncJob } from '@/types/syncJob'
import type { Source } from '@/types/source'
import styles from './SchedulerPage.module.css'

function statusClass(status: SyncJob['status']): string {
  switch (status) {
    case 'due':
      return `${styles.jobStatus} ${styles.jobStatusDue}`
    case 'running':
      return `${styles.jobStatus} ${styles.jobStatusRunning}`
    case 'failed':
      return `${styles.jobStatus} ${styles.jobStatusFailed}`
    case 'completed':
      return `${styles.jobStatus} ${styles.jobStatusCompleted}`
    case 'manual':
      return `${styles.jobStatus} ${styles.jobStatusManual}`
    default:
      return `${styles.jobStatus} ${styles.jobStatusIdle}`
  }
}

interface SchedulerJobRowProps {
  job: SyncJob
  source: Source | undefined
  isQueued: boolean
  onRunSync: () => void
}

function SchedulerJobRow({ job, source, isQueued, onRunSync }: SchedulerJobRowProps) {
  return (
    <tr className={styles.row}>
      <td className={styles.cell}>
        <Link to={sourceDetailPath(job.sourceId)} className={styles.sourceLink}>
          {job.sourceName}
        </Link>
      </td>
      <td className={styles.cell}>{job.connectorType}</td>
      <td className={styles.cell}>
        <span className={statusClass(job.status)}>{formatSyncStatusLabel(job.status)}</span>
      </td>
      <td className={styles.cell}>
        {source ? <SourceTrustDisplay source={source} compact /> : '—'}
      </td>
      <td className={styles.cell}>
        {job.lastSyncAt ? formatDate(job.lastSyncAt) : 'Never'}
      </td>
      <td className={styles.cell}>
        {formatNextSyncLabel(job.lastSyncAt, job.updateInterval)}
      </td>
      <td className={styles.cell}>{formatIntervalLabel(job.updateInterval)}</td>
      <td className={styles.cell}>{job.itemsCollected}</td>
      <td className={styles.cell}>
        <button
          className={styles.syncButton}
          type="button"
          onClick={onRunSync}
          disabled={isQueued}
        >
          {isQueued ? 'Queued' : 'Run Sync Now'}
        </button>
      </td>
    </tr>
  )
}

export function SchedulerPage() {
  const { user } = useAuth()
  const { snapshot, stats: queueStats, processQueue } = useQueue()
  const { sources, isLoading, error, refetch } = useSources()
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [enqueueingIds, setEnqueueingIds] = useState<Set<string>>(new Set())
  const [runtime, setRuntime] = useState(() => getSchedulerRuntimeState())
  const [isRunningAll, setIsRunningAll] = useState(false)

  const jobs = useMemo(() => getAllSourceSyncJobs(sources), [sources, snapshot.jobs])
  const stats = useMemo(
    () => ({
      ...computeSchedulerStats(jobs, queueStats.running),
      jobsToday: runtime.jobsToday,
      averageRuntimeMs: queueStats.averageDurationMs,
      paused: runtime.paused,
      lastRunAt: runtime.lastRunAt,
    }),
    [jobs, queueStats, runtime],
  )

  const refreshRuntime = () => setRuntime(getSchedulerRuntimeState())

  const handlePauseResume = () => {
    setSchedulerPaused(!runtime.paused)
    refreshRuntime()
  }

  const handleMaxConcurrentChange = (value: number) => {
    setMaxConcurrentJobs(value)
    refreshRuntime()
  }

  const handleRunAllDue = async () => {
    if (!user) {
      return
    }

    setIsRunningAll(true)
    try {
      await runAllDueSourcesNow(user.id)
      refreshRuntime()
      await refetch()
    } finally {
      setIsRunningAll(false)
    }
  }

  const handleRunSync = async (sourceId: string) => {
    const source = sources.find((item) => item.id === sourceId)
    if (!source || !user) {
      return
    }

    setEnqueueingIds((prev) => new Set(prev).add(sourceId))
    setRowErrors((prev) => {
      const next = { ...prev }
      delete next[sourceId]
      return next
    })

    try {
      const result = await enqueueSourceSync(source, user.id)

      if (!result.success) {
        setRowErrors((prev) => ({
          ...prev,
          [sourceId]: result.errorMessage ?? 'Failed to queue sync',
        }))
        return
      }

      await processQueue()
      await refetch()
    } catch (err) {
      setRowErrors((prev) => ({
        ...prev,
        [sourceId]: err instanceof Error ? err.message : 'Failed to queue sync',
      }))
    } finally {
      setEnqueueingIds((prev) => {
        const next = new Set(prev)
        next.delete(sourceId)
        return next
      })
    }
  }

  return (
    <PageContainer
      title="Scheduler"
      description="Monitor sync schedules, due jobs, and queue manual imports for intelligence sources."
    >
      {isLoading && <div className={styles.stateBox}>Loading scheduler…</div>}

      {error && (
        <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className={styles.controls}>
            <button
              className={styles.controlButton}
              type="button"
              onClick={handlePauseResume}
            >
              {runtime.paused ? 'Resume scheduler' : 'Pause scheduler'}
            </button>
            <button
              className={styles.controlButton}
              type="button"
              onClick={handleRunAllDue}
              disabled={isRunningAll || runtime.paused}
            >
              {isRunningAll ? 'Running…' : 'Run all due now'}
            </button>
            <label className={styles.concurrentControl}>
              <span>Max concurrent jobs</span>
              <select
                value={runtime.maxConcurrentJobs}
                onChange={(event) => handleMaxConcurrentChange(Number(event.target.value))}
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
            <span className={styles.schedulerState}>
              Scheduler: {runtime.paused ? 'Paused' : 'Active'}
            </span>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Total Sources</p>
              <p className={styles.statValue}>{stats.totalSources}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Due Now</p>
              <p className={styles.statValue}>{stats.dueNow}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Running</p>
              <p className={styles.statValue}>{stats.running}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Failed</p>
              <p className={styles.statValue}>{stats.failed}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Manual Only</p>
              <p className={styles.statValue}>{stats.manualOnly}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Jobs today</p>
              <p className={styles.statValue}>{stats.jobsToday ?? 0}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Avg runtime</p>
              <p className={styles.statValue}>
                {stats.averageRuntimeMs
                  ? `${Math.round(stats.averageRuntimeMs / 1000)}s`
                  : '—'}
              </p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Last run</p>
              <p className={styles.statValueSmall}>
                {stats.lastRunAt ? formatDate(stats.lastRunAt) : '—'}
              </p>
            </div>
          </div>

          {sources.length === 0 ? (
            <div className={styles.stateBox}>No sources configured yet.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Source</th>
                    <th className={styles.th}>Connector</th>
                    <th className={styles.th}>Status</th>
                    <th className={styles.th}>Health</th>
                    <th className={styles.th}>Last sync</th>
                    <th className={styles.th}>Next sync</th>
                    <th className={styles.th}>Interval</th>
                    <th className={styles.th}>Items</th>
                    <th className={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => {
                    const activeJob = getActiveJobForSource(job.sourceId)
                    const isQueued =
                      enqueueingIds.has(job.sourceId) ||
                      activeJob?.status === 'waiting' ||
                      activeJob?.status === 'running'

                    return (
                      <Fragment key={job.id}>
                        <SchedulerJobRow
                          job={job}
                          source={sources.find((item) => item.id === job.sourceId)}
                          isQueued={isQueued}
                          onRunSync={() => handleRunSync(job.sourceId)}
                        />
                        {rowErrors[job.sourceId] && (
                          <tr className={styles.errorRow}>
                            <td className={styles.errorCell} colSpan={9}>
                              {rowErrors[job.sourceId]}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </PageContainer>
  )
}
