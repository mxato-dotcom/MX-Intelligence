import { Link } from 'react-router-dom'
import { sourceDetailPath } from '@/lib/constants'
import type { Source } from '@/types/source'
import styles from './SourceCard.module.css'

interface SourceCardProps {
  source: Source
}

export function SourceCard({ source }: SourceCardProps) {
  const isEnabled = source.status === 'enabled' && source.active

  return (
    <Link to={sourceDetailPath(source.id)} className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>{source.name}</h3>
        <div className={styles.badges}>
          <span
            className={
              isEnabled ? `${styles.badge} ${styles.badgeActive}` : `${styles.badge} ${styles.badgeInactive}`
            }
          >
            {isEnabled ? 'Active' : 'Inactive'}
          </span>
          <span className={styles.badge}>{source.status}</span>
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
    </Link>
  )
}
