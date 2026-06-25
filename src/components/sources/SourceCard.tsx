import { Link } from 'react-router-dom'
import { formatDate } from '@/lib/format'
import { sourceDetailPath } from '@/lib/constants'
import { SourceFeedActions } from '@/components/sources/SourceFeedActions'
import type { Source } from '@/types/source'
import type { SourceSyncState } from '@/types/sourceSync'
import styles from './SourceCard.module.css'

interface SourceCardProps {
  source: Source
  syncState: SourceSyncState
}

function healthBadgeClass(health: SourceSyncState['health']): string {
  switch (health) {
    case 'healthy':
      return `${styles.badge} ${styles.badgeHealthy}`
    case 'degraded':
      return `${styles.badge} ${styles.badgeDegraded}`
    case 'unhealthy':
      return `${styles.badge} ${styles.badgeUnhealthy}`
    default:
      return styles.badge
  }
}

export function SourceCard({ source, syncState }: SourceCardProps) {
  const isEnabled = source.status === 'enabled' && source.active

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Link to={sourceDetailPath(source.id)} className={styles.titleLink}>
          <h3 className={styles.title}>{source.name}</h3>
        </Link>
        <div className={styles.badges}>
          <span
            className={
              isEnabled ? `${styles.badge} ${styles.badgeActive}` : `${styles.badge} ${styles.badgeInactive}`
            }
          >
            {isEnabled ? 'Active' : 'Inactive'}
          </span>
          <span className={styles.badge}>{source.status}</span>
          <span className={healthBadgeClass(syncState.health)}>{syncState.health}</span>
        </div>
      </div>

      <div className={styles.meta}>
        <span className={styles.metaItem}>
          Type: <span className={styles.metaLabel}>{source.source_type}</span>
        </span>
        <span className={styles.metaItem}>
          Category: <span className={styles.metaLabel}>{source.category}</span>
        </span>
        <span className={styles.metaItem}>
          Priority: <span className={styles.metaLabel}>{source.priority}</span>
        </span>
        <span className={styles.metaItem}>
          Interval: <span className={styles.metaLabel}>{source.update_interval}</span>
        </span>
      </div>

      <p className={styles.trustScore}>
        Trust score: <span className={styles.trustValue}>{source.trust_score}</span>
      </p>

      <div className={styles.syncGrid}>
        <div className={styles.syncItem}>
          <span className={styles.syncLabel}>Last sync</span>
          <span className={styles.syncValue}>
            {syncState.lastSync ? formatDate(syncState.lastSync) : 'Not synced yet'}
          </span>
        </div>
        <div className={styles.syncItem}>
          <span className={styles.syncLabel}>Next sync</span>
          <span className={styles.syncValue}>{syncState.nextSync}</span>
        </div>
        <div className={styles.syncItem}>
          <span className={styles.syncLabel}>Health</span>
          <span className={styles.syncValue}>{syncState.health}</span>
        </div>
        <div className={styles.syncItem}>
          <span className={styles.syncLabel}>Error count</span>
          <span className={styles.syncValue}>{syncState.errorCount}</span>
        </div>
        <div className={styles.syncItem}>
          <span className={styles.syncLabel}>Items collected</span>
          <span className={styles.syncValue}>{syncState.itemsCollected}</span>
        </div>
      </div>

      <SourceFeedActions source={source} compact />
    </div>
  )
}
