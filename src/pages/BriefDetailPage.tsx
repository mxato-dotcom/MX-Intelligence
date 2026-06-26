import { Link, useParams } from 'react-router-dom'
import { BriefSection } from '@/components/dashboard/BriefSection'
import { FusionClusterCard } from '@/components/fusion/FusionClusterCard'
import { PageContainer } from '@/components/layout/PageContainer'
import { getOrderedBriefSections } from '@/intelligence/brief/BriefGenerator'
import { riskLevelClass } from '@/intelligence/brief/BriefScoring'
import { useBrief } from '@/hooks/useBrief'
import { articleDetailPath, ROUTES } from '@/lib/constants'
import { formatDate } from '@/lib/format'
import { safeStringOr } from '@/lib/safeString'
import styles from './BriefDetailPage.module.css'

export function BriefDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { brief, relatedArticles, relatedClusters, isLoading, error } = useBrief(id)

  if (isLoading) {
    return (
      <PageContainer title="Intelligence Brief">
        <div className={styles.stateBox}>Loading briefing…</div>
      </PageContainer>
    )
  }

  if (error || !brief) {
    return (
      <PageContainer
        title="Intelligence Brief"
        actions={
          <Link to={ROUTES.BRIEFS} className={styles.backLink}>
            Back to briefs
          </Link>
        }
      >
        <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">
          {error ?? 'Brief not found'}
        </div>
      </PageContainer>
    )
  }

  const sections = getOrderedBriefSections(brief.payload.sections)

  return (
    <PageContainer
      title={brief.title}
      actions={
        <Link to={ROUTES.BRIEFS} className={styles.backLink}>
          Back to briefs
        </Link>
      }
    >
      <div className={styles.detail}>
        <div className={styles.metaRow}>
          <span className={`${styles.riskBadge} ${styles[riskLevelClass(brief.riskLevel)]}`}>
            {brief.riskLevel} risk
          </span>
          <span className={styles.metaItem}>{brief.importanceScore}% importance</span>
          <span className={styles.metaItem}>{brief.payload.overallConfidence}% confidence</span>
          <time className={styles.metaItem} dateTime={brief.generatedAt}>
            {formatDate(brief.generatedAt)}
          </time>
        </div>

        <section className={styles.block}>
          <h3 className={styles.blockTitle}>Executive Summary</h3>
          <p className={styles.text}>{brief.executiveSummary}</p>
        </section>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Articles analyzed</span>
            <span className={styles.statValue}>{brief.articleCount}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Clusters analyzed</span>
            <span className={styles.statValue}>{brief.clusterCount}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Entities analyzed</span>
            <span className={styles.statValue}>{brief.entityCount}</span>
          </div>
        </div>

        <section className={styles.block}>
          <h3 className={styles.blockTitle}>Section summaries</h3>
          <div className={styles.sections}>
            {sections.map((section) => (
              <BriefSection key={section.id} section={section} />
            ))}
          </div>
        </section>

        <section className={styles.block}>
          <h3 className={styles.blockTitle}>Risk indicators</h3>
          <ul className={styles.list}>
            <li>Risk level: {brief.riskLevel}</li>
            <li>Importance score: {brief.importanceScore}</li>
            <li>Overall confidence: {brief.payload.overallConfidence}%</li>
            {brief.payload.topEvent && <li>Top event: {brief.payload.topEvent.value}</li>}
          </ul>
        </section>

        <section className={styles.block}>
          <h3 className={styles.blockTitle}>Related clusters</h3>
          {relatedClusters.length === 0 ? (
            <p className={styles.text}>No related clusters available for this briefing.</p>
          ) : (
            <div className={styles.clusterList}>
              {relatedClusters.map((cluster) => (
                <FusionClusterCard key={cluster.id} cluster={cluster} />
              ))}
            </div>
          )}
        </section>

        <section className={styles.block}>
          <h3 className={styles.blockTitle}>Related entities</h3>
          <div className={styles.chips}>
            {brief.payload.relatedEntities.map((entity) => (
              <span key={`${entity.type}-${entity.label}`} className={styles.chip}>
                {entity.label} ({entity.type}, {entity.count})
              </span>
            ))}
          </div>
        </section>

        <section className={styles.block}>
          <h3 className={styles.blockTitle}>Source breakdown</h3>
          <div className={styles.sourceList}>
            {brief.payload.sourcesUsed.map((source) => (
              <div key={source.sourceName} className={styles.sourceRow}>
                <span>{source.sourceName}</span>
                <span>{source.articleCount} articles</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.block}>
          <h3 className={styles.blockTitle}>Related articles</h3>
          {relatedArticles.length === 0 ? (
            <p className={styles.text}>No related articles linked to this briefing.</p>
          ) : (
            <div className={styles.articleList}>
              {relatedArticles.map((article) => (
                <Link key={article.id} to={articleDetailPath(article.id)} className={styles.articleItem}>
                  <span className={styles.articleTitle}>{safeStringOr(article.title, 'Untitled')}</span>
                  <span className={styles.articleMeta}>{safeStringOr(article.source, 'Unknown source')}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageContainer>
  )
}
