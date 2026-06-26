import type { EntityIntelligenceProfile } from '@/types/entityProfile'
import styles from './EntityProfileSections.module.css'

interface EntityProfileStatsProps {
  stats: EntityIntelligenceProfile['stats']
}

export function EntityProfileStats({ stats }: EntityProfileStatsProps) {
  return (
    <div className={styles.statsGrid}>
      <div className={styles.statCard}>
        <p className={styles.statLabel}>Articles</p>
        <p className={styles.statValue}>{stats.articles}</p>
      </div>
      <div className={styles.statCard}>
        <p className={styles.statLabel}>Mentions</p>
        <p className={styles.statValue}>{stats.mentions}</p>
      </div>
      <div className={styles.statCard}>
        <p className={styles.statLabel}>Clusters</p>
        <p className={styles.statValue}>{stats.clusters}</p>
      </div>
      <div className={styles.statCard}>
        <p className={styles.statLabel}>Connections</p>
        <p className={styles.statValue}>{stats.connections}</p>
      </div>
      <div className={styles.statCard}>
        <p className={styles.statLabel}>Average Trust</p>
        <p className={styles.statValue}>{stats.averageTrust}</p>
      </div>
      <div className={styles.statCard}>
        <p className={styles.statLabel}>Average Confidence</p>
        <p className={styles.statValue}>{stats.averageConfidence}%</p>
      </div>
    </div>
  )
}

export function EntityProfileSummary({ summary }: { summary: string }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Intelligence Summary</h3>
      <p className={styles.summary}>{summary}</p>
    </section>
  )
}
