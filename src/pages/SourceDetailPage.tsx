import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { SourceConnectorPanel } from '@/components/sources/SourceConnectorPanel'
import { SourceTrustDisplay } from '@/components/sources/SourceTrustDisplay'
import { PageContainer } from '@/components/layout/PageContainer'
import { useSource } from '@/hooks/useSource'
import { formatDate } from '@/lib/format'
import { ROUTES, sourceEditPath } from '@/lib/constants'
import * as sourceService from '@/services/sourceService'
import styles from './SourceDetailPage.module.css'

export function SourceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { source, isLoading, error, refetch } = useSource(id)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isActing, setIsActing] = useState(false)

  const handleToggleActive = async () => {
    if (!source) return

    setActionError(null)
    setIsActing(true)

    try {
      await sourceService.toggleSourceActive(source.id, !source.active)
      await refetch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update source')
    } finally {
      setIsActing(false)
    }
  }

  const handleDelete = async () => {
    if (!source) return

    const confirmed = window.confirm(`Delete source "${source.name}"? This cannot be undone.`)
    if (!confirmed) return

    setActionError(null)
    setIsActing(true)

    try {
      await sourceService.deleteSource(source.id)
      navigate(ROUTES.SOURCES)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete source')
      setIsActing(false)
    }
  }

  if (isLoading) {
    return (
      <PageContainer title="Source">
        <div className={styles.stateBox}>Loading source…</div>
      </PageContainer>
    )
  }

  if (error || !source) {
    return (
      <PageContainer
        title="Source"
        actions={
          <Link to={ROUTES.SOURCES} className={styles.backLink}>
            Back to sources
          </Link>
        }
      >
        <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">
          {error ?? 'Source not found'}
        </div>
      </PageContainer>
    )
  }

  const isEnabled = source.status === 'enabled' && source.active

  return (
    <PageContainer
      title={source.name}
      actions={
        <Link to={ROUTES.SOURCES} className={styles.backLink}>
          Back to sources
        </Link>
      }
    >
      <div className={styles.detail}>
        <div className={styles.meta}>
          <span
            className={
              isEnabled
                ? `${styles.badge} ${styles.badgeActive}`
                : `${styles.badge} ${styles.badgeInactive}`
            }
          >
            {isEnabled ? 'Active' : 'Inactive'}
          </span>
          <span className={styles.badge}>{source.status}</span>
          <span className={styles.badge}>{source.source_type}</span>
          <span className={styles.badge}>{source.category}</span>
        </div>

        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Priority</span>
            <span className={styles.fieldValue}>{source.priority}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Trust & health</span>
            <span className={styles.fieldValue}>
              <SourceTrustDisplay source={source} />
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Update interval</span>
            <span className={styles.fieldValue}>{source.update_interval}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Created</span>
            <span className={styles.fieldValue}>{formatDate(source.created_at)}</span>
          </div>
          {source.last_sync_at && (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Last sync</span>
              <span className={styles.fieldValue}>{formatDate(source.last_sync_at)}</span>
            </div>
          )}
        </div>

        {source.description && <p className={styles.description}>{source.description}</p>}

        {source.url && (
          <p className={styles.externalLink}>
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              Open source URL
            </a>
          </p>
        )}

        <SourceConnectorPanel source={source} onSyncComplete={refetch} />

        {actionError && (
          <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">
            {actionError}
          </div>
        )}

        <div className={styles.actions}>
          <Link to={sourceEditPath(source.id)} className={styles.actionButton}>
            Edit
          </Link>
          <button
            className={styles.actionButton}
            type="button"
            onClick={handleToggleActive}
            disabled={isActing}
          >
            {source.active ? 'Deactivate' : 'Activate'}
          </button>
          <button
            className={`${styles.actionButton} ${styles.actionButtonDanger}`}
            type="button"
            onClick={handleDelete}
            disabled={isActing}
          >
            Delete
          </button>
        </div>
      </div>
    </PageContainer>
  )
}
