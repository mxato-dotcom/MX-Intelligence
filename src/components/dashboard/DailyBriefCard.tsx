import { Link } from 'react-router-dom'
import { BriefSection } from '@/components/dashboard/BriefSection'
import { getOrderedBriefSections } from '@/intelligence/brief/BriefGenerator'
import { riskLevelClass } from '@/intelligence/brief/BriefScoring'
import type { IntelligenceDailyBrief } from '@/intelligence/brief/BriefTypes'
import { formatDate } from '@/lib/format'
import { ROUTES, briefDetailPath } from '@/lib/constants'
import styles from './DailyBriefCard.module.css'

interface DailyBriefCardProps {
  brief: IntelligenceDailyBrief | null
  isGenerating?: boolean
}

function HighlightItem({
  label,
  value,
  confidence,
}: {
  label: string
  value: string
  confidence?: number
}) {
  return (
    <div className={styles.highlightItem}>
      <span className={styles.highlightLabel}>{label}</span>
      <span className={styles.highlightValue}>{value}</span>
      {confidence !== undefined && (
        <span className={styles.highlightConfidence}>{confidence}% confidence</span>
      )}
    </div>
  )
}

export function DailyBriefCard({ brief, isGenerating = false }: DailyBriefCardProps) {
  if (isGenerating) {
    return (
      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Today&apos;s Intelligence Brief</h3>
        <p className={styles.loading}>Generating intelligence brief…</p>
      </section>
    )
  }

  if (!brief) {
    return (
      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Today&apos;s Intelligence Brief</h3>
        <p className={styles.empty}>
          No briefing generated yet. Import articles or run a sync to produce the first daily brief.
        </p>
      </section>
    )
  }

  const sections = getOrderedBriefSections(brief.payload.sections).filter(
    (section) => section.articleCount > 0 || section.summary.length > 0,
  )

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.cardTitle}>Today&apos;s Intelligence Brief</h3>
          <p className={styles.subtitle}>{brief.title}</p>
          <time className={styles.date} dateTime={brief.generatedAt}>
            Generated {formatDate(brief.generatedAt)}
          </time>
        </div>
        <Link to={briefDetailPath(brief.id)} className={styles.viewLink}>
          Open briefing
        </Link>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statPill}>
          <span className={styles.statLabel}>Risk</span>
          <span className={`${styles.riskBadge} ${styles[riskLevelClass(brief.riskLevel)]}`}>
            {brief.riskLevel}
          </span>
        </div>
        <div className={styles.statPill}>
          <span className={styles.statLabel}>Articles</span>
          <span className={styles.statValue}>{brief.articleCount}</span>
        </div>
        <div className={styles.statPill}>
          <span className={styles.statLabel}>Clusters</span>
          <span className={styles.statValue}>{brief.clusterCount}</span>
        </div>
        <div className={styles.statPill}>
          <span className={styles.statLabel}>Entities</span>
          <span className={styles.statValue}>{brief.entityCount}</span>
        </div>
        <div className={styles.statPill}>
          <span className={styles.statLabel}>Confidence</span>
          <span className={styles.statValue}>{brief.payload.overallConfidence}%</span>
        </div>
      </div>

      <div className={styles.executiveSummary}>
        <h4 className={styles.sectionHeading}>Executive Summary</h4>
        <p className={styles.executiveText}>{brief.executiveSummary}</p>
      </div>

      <div className={styles.highlightsGrid}>
        {brief.payload.topEvent && (
          <HighlightItem
            label={brief.payload.topEvent.label}
            value={brief.payload.topEvent.value}
            confidence={brief.payload.topEvent.confidenceScore}
          />
        )}
        {brief.payload.topTechnology && (
          <HighlightItem
            label={brief.payload.topTechnology.label}
            value={brief.payload.topTechnology.value}
            confidence={brief.payload.topTechnology.confidenceScore}
          />
        )}
        {brief.payload.topOrganization && (
          <HighlightItem
            label={brief.payload.topOrganization.label}
            value={brief.payload.topOrganization.value}
            confidence={brief.payload.topOrganization.confidenceScore}
          />
        )}
        {brief.payload.topCountry && (
          <HighlightItem
            label={brief.payload.topCountry.label}
            value={brief.payload.topCountry.value}
            confidence={brief.payload.topCountry.confidenceScore}
          />
        )}
      </div>

      {brief.payload.sourcesUsed.length > 0 && (
        <div className={styles.sourcesBlock}>
          <h4 className={styles.sectionHeading}>Sources Used</h4>
          <div className={styles.sourceList}>
            {brief.payload.sourcesUsed.slice(0, 6).map((source) => (
              <span key={source.sourceName} className={styles.sourceChip}>
                {source.sourceName} ({source.articleCount})
              </span>
            ))}
          </div>
        </div>
      )}

      {sections.length > 0 && (
        <div className={styles.sectionsBlock}>
          <div className={styles.sectionsHeader}>
            <h4 className={styles.sectionHeading}>Brief Sections</h4>
            <Link to={ROUTES.BRIEFS} className={styles.historyLink}>
              View history
            </Link>
          </div>
          {sections.slice(0, 4).map((section) => (
            <BriefSection key={section.id} section={section} compact />
          ))}
        </div>
      )}
    </section>
  )
}
