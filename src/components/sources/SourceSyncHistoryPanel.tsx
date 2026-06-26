import { useEffect, useState } from 'react'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
import { getSourceSyncHistory } from '@/services/syncMetricsService'
import type { ConnectorSyncHistoryRecord } from '@/types/syncHistory'
import styles from './SourceSyncHistoryPanel.module.css'

interface SourceSyncHistoryPanelProps {
  sourceId: string
}

export function SourceSyncHistoryPanel({ sourceId }: SourceSyncHistoryPanelProps) {
  const [history, setHistory] = useState<ConnectorSyncHistoryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const rows = await getSourceSyncHistory(sourceId, 15)
        if (active) {
          setHistory(rows)
        }
      } catch {
        if (active) {
          setHistory([])
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    load()
    return () => {
      active = false
    }
  }, [sourceId])

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Sync history</h2>
      {isLoading ? (
        <p className={styles.empty}>Loading sync history…</p>
      ) : history.length === 0 ? (
        <p className={styles.empty}>No sync runs recorded for this source yet.</p>
      ) : (
        <ul className={styles.list}>
          {history.map((run) => (
            <li key={run.id} className={styles.row}>
              <span className={styles.status}>{run.status}</span>
              <span>{run.articlesImported} imported</span>
              <span>{run.duplicates} duplicates</span>
              <span>{run.durationMs ? `${run.durationMs} ms` : '—'}</span>
              <span>{formatRelativeTime(run.startedAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
