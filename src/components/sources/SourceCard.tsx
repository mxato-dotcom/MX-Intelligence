import { Link } from 'react-router-dom'
import { SourceFeedActions } from '@/components/sources/SourceFeedActions'
import { SourceSyncPanel } from '@/components/sources/SourceSyncPanel'
import { SourceTrustDisplay } from '@/components/sources/SourceTrustDisplay'
import { useSourceClusterSummary } from '@/hooks/useSourceClusterSummary'
import { formatDate } from '@/lib/format'
import { sourceDetailPath } from '@/lib/constants'
import type { Source } from '@/types/source'
import styles from './SourceCard.module.css'

interface SourceCardProps {
  source: Source
  onSourceUpdated?: () => void
}

export function SourceCard({ source, onSourceUpdated }: SourceCardProps) {
  const isEnabled = source.status === 'enabled' && source.active
  const clusterSummary = useSourceClusterSummary(source.name)

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
          <span className={styles.badge}>{source.source_type}</span>
        </div>
      </div>

      <div className={styles.meta}>
        <span className={styles.metaItem}>
          Category: <span className={styles.metaLabel}>{source.category}</span>
        </span>
        <span className={styles.metaItem}>
          Priority: <span className={styles.metaLabel}>{source.priority}</span>
        </span>
        <span className={styles.metaItem}>
          <SourceTrustDisplay source={source} compact />
        </span>
        <span className={styles.metaItem}>
          Created: <span className={styles.metaLabel}>{formatDate(source.created_at)}</span>
        </span>
        {clusterSummary.clusterCount > 0 && (
          <span className={styles.metaItem}>
            Clusters: <span className={styles.metaLabel}>{clusterSummary.clusterCount}</span>
            {clusterSummary.confirmedCount > 0 && (
              <span className={styles.metaLabel}> · {clusterSummary.confirmedCount} confirmed</span>
            )}
          </span>
        )}
      </div>

      <SourceSyncPanel source={source} onSyncComplete={onSourceUpdated} />

      <SourceFeedActions source={source} onSourceUpdated={onSourceUpdated} compact />
    </div>
  )
}
