import type { BriefSectionData } from '@/intelligence/brief/BriefTypes'
import styles from './BriefSection.module.css'

interface BriefSectionProps {
  section: BriefSectionData
  compact?: boolean
}

export function BriefSection({ section, compact = false }: BriefSectionProps) {
  if (compact) {
    return (
      <div className={styles.compactSection}>
        <div className={styles.compactHeader}>
          <h4 className={styles.title}>{section.title}</h4>
          <span className={styles.confidence}>{section.confidenceScore}%</span>
        </div>
        <p className={styles.summary}>{section.summary}</p>
      </div>
    )
  }

  return (
    <article className={styles.section}>
      <div className={styles.header}>
        <h4 className={styles.title}>{section.title}</h4>
        <span className={styles.confidenceBadge}>{section.confidenceScore}% confidence</span>
      </div>
      <p className={styles.summary}>{section.summary}</p>
      <div className={styles.meta}>
        <span>{section.articleCount} supporting articles</span>
        {section.entityLabels.length > 0 && (
          <span>Entities: {section.entityLabels.slice(0, 4).join(', ')}</span>
        )}
      </div>
    </article>
  )
}
