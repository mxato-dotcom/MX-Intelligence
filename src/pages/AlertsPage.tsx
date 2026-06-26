import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertSeverityBadge } from '@/components/alerts/AlertSeverityBadge'
import { PageContainer } from '@/components/layout/PageContainer'
import { useDataRefresh } from '@/contexts/DataRefreshContext'
import { briefDetailPath } from '@/lib/constants'
import { formatDate } from '@/lib/format'
import {
  archiveAlert,
  computeAlertStats,
  deleteAlert,
  getAlerts,
  markAlertRead,
  markAllAlertsRead,
} from '@/services/alertService'
import type { IntelligenceAlert } from '@/types/alert'
import styles from './AlertsPage.module.css'

export function AlertsPage() {
  const { refreshToken, notifyDataRefresh } = useDataRefresh()
  const [alerts, setAlerts] = useState<IntelligenceAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const loadAlerts = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const loaded = await getAlerts()
      setAlerts(loaded)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAlerts()
  }, [loadAlerts, refreshToken])

  const stats = computeAlertStats(alerts)

  const runAction = async (id: string, action: 'read' | 'archive' | 'delete') => {
    setProcessingId(id)
    setActionError(null)

    try {
      if (action === 'read') {
        await markAlertRead(id)
      } else if (action === 'archive') {
        await archiveAlert(id)
      } else {
        await deleteAlert(id)
      }

      notifyDataRefresh()
      await loadAlerts()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Alert action failed')
    } finally {
      setProcessingId(null)
    }
  }

  const handleMarkAllRead = async () => {
    setProcessingId('all')
    setActionError(null)

    try {
      await markAllAlertsRead()
      notifyDataRefresh()
      await loadAlerts()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to mark alerts as read')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <PageContainer
      title="Intelligence Alerts"
      description="In-app alerts generated from high-signal intelligence briefs. No external notifications are sent."
      actions={
        stats.unread > 0 ? (
          <button
            type="button"
            className={styles.markAllButton}
            onClick={handleMarkAllRead}
            disabled={processingId === 'all'}
          >
            {processingId === 'all' ? 'Marking read…' : 'Mark all read'}
          </button>
        ) : null
      }
    >
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Alerts</span>
          <span className={styles.statValue}>{stats.total}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Unread Alerts</span>
          <span className={styles.statValue}>{stats.unread}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Critical Alerts</span>
          <span className={styles.statValue}>{stats.critical}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>High Alerts</span>
          <span className={styles.statValue}>{stats.high}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Archived Alerts</span>
          <span className={styles.statValue}>{stats.archived}</span>
        </div>
      </div>

      {actionError && (
        <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">
          {actionError}
        </div>
      )}

      {isLoading && <div className={styles.stateBox}>Loading alerts…</div>}

      {error && !isLoading && (
        <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">
          {error}
        </div>
      )}

      {!isLoading && !error && alerts.length === 0 && (
        <div className={styles.emptyState}>
          <h3 className={styles.emptyTitle}>No intelligence alerts yet</h3>
          <p className={styles.emptyText}>
            Alerts are created automatically when briefs report high risk, high importance, strong
            confidence, cybersecurity signals, or conflicting reports.
          </p>
        </div>
      )}

      {!isLoading && !error && alerts.length > 0 && (
        <div className={styles.list}>
          {alerts.map((alert) => (
            <article key={alert.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.cardTitle}>{alert.title}</h3>
                  <time className={styles.cardDate} dateTime={alert.createdAt}>
                    {formatDate(alert.createdAt)}
                  </time>
                </div>
                <div className={styles.badges}>
                  <AlertSeverityBadge severity={alert.severity} />
                  <span className={styles.statusBadge}>{alert.status}</span>
                </div>
              </div>

              <p className={styles.message}>{alert.message}</p>

              <div className={styles.meta}>
                <span>Category: {alert.category}</span>
                {alert.relatedBriefId && (
                  <Link to={briefDetailPath(alert.relatedBriefId)} className={styles.relatedLink}>
                    View related brief
                  </Link>
                )}
                {alert.relatedEntity && <span>Entity: {alert.relatedEntity}</span>}
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.actionButton}
                  disabled={processingId === alert.id || alert.status !== 'unread'}
                  onClick={() => runAction(alert.id, 'read')}
                >
                  Mark read
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  disabled={processingId === alert.id || alert.status === 'archived'}
                  onClick={() => runAction(alert.id, 'archive')}
                >
                  Archive
                </button>
                <button
                  type="button"
                  className={styles.actionButtonDanger}
                  disabled={processingId === alert.id}
                  onClick={() => runAction(alert.id, 'delete')}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </PageContainer>
  )
}
