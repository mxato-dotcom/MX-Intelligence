import { Link } from 'react-router-dom'
import { EntityTypeIcon } from '@/components/entityProfile/EntityTypeIcon'
import { entitiesComparePath } from '@/lib/constants'
import { formatDate } from '@/lib/format'
import type { EntityIntelligenceProfile } from '@/types/entityProfile'
import styles from './EntityProfileHeader.module.css'

interface EntityProfileHeaderProps {
  profile: EntityIntelligenceProfile
}

export function EntityProfileHeader({ profile }: EntityProfileHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.titleRow}>
        <EntityTypeIcon entityType={profile.entityType} className={styles.icon} />
        <div>
          <h2 className={styles.name}>{profile.displayText}</h2>
          <p className={styles.type}>{profile.entityType}</p>
        </div>
        <Link to={entitiesComparePath(profile.entityId)} className={styles.compareButton}>
          Compare
        </Link>
      </div>

      <div className={styles.metaGrid}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Confidence</span>
          <span className={styles.metaValue}>{profile.confidence}%</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Mentions</span>
          <span className={styles.metaValue}>{profile.totalMentions}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Articles</span>
          <span className={styles.metaValue}>{profile.totalArticles}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Clusters</span>
          <span className={styles.metaValue}>{profile.totalClusters}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>First Seen</span>
          <span className={styles.metaValue}>{formatDate(profile.firstSeen)}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Last Seen</span>
          <span className={styles.metaValue}>{formatDate(profile.lastSeen)}</span>
        </div>
      </div>

      {profile.relatedSources.length > 0 && (
        <div className={styles.sources}>
          <span className={styles.metaLabel}>Related Sources</span>
          <div className={styles.sourceChips}>
            {profile.relatedSources.map((source) => (
              <span key={source} className={styles.sourceChip}>{source}</span>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
