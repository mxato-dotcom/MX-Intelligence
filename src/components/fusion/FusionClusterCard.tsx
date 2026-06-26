import { formatDate } from '@/lib/format'
import { safeStringOr } from '@/lib/safeString'
import type { IntelligenceCluster, SourceAgreement } from '@/intelligence/fusion/FusionCluster'
import styles from './FusionClusterCard.module.css'

interface FusionClusterCardProps {
  cluster: IntelligenceCluster
  compact?: boolean
}

function agreementClass(agreement: SourceAgreement): string {
  switch (agreement) {
    case 'Confirmed':
      return `${styles.agreement} ${styles.agreementConfirmed}`
    case 'Likely':
      return `${styles.agreement} ${styles.agreementLikely}`
    case 'Conflicting':
      return `${styles.agreement} ${styles.agreementConflicting}`
    default:
      return `${styles.agreement} ${styles.agreementSingle}`
  }
}

export function FusionClusterCard({ cluster, compact = false }: FusionClusterCardProps) {
  if (compact) {
    return (
      <div className={styles.compactCard}>
        <span className={styles.confidence}>{cluster.confidenceScore}</span>
        <span className={agreementClass(cluster.agreement)}>{cluster.agreement}</span>
        <span className={styles.reportCount}>{cluster.reportCount} reports</span>
      </div>
    )
  }

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <h4 className={styles.title}>{safeStringOr(cluster.mainTitle, 'Untitled cluster')}</h4>
        <span className={styles.confidenceBadge}>{cluster.confidenceScore}%</span>
      </div>

      <p className={styles.summary}>
        {cluster.summary || 'No summary available for this cluster.'}
      </p>

      <div className={styles.meta}>
        <span className={agreementClass(cluster.agreement)}>{cluster.agreement}</span>
        <span className={styles.metaItem}>{cluster.reportCount} reports</span>
        <span className={styles.metaItem}>{cluster.contributingSources.length} sources</span>
        <span className={styles.metaItem}>Trust avg {cluster.averageTrustScore}</span>
        <time className={styles.metaItem} dateTime={cluster.latestUpdate}>
          {formatDate(cluster.latestUpdate)}
        </time>
      </div>

      {cluster.keywords.length > 0 && (
        <div className={styles.keywords}>
          {cluster.keywords.map((keyword) => (
            <span key={keyword} className={styles.keyword}>{keyword}</span>
          ))}
        </div>
      )}

      <p className={styles.sources}>
        Sources: {cluster.contributingSources.length > 0 ? cluster.contributingSources.join(', ') : 'None'}
      </p>
    </article>
  )
}
