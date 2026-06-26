import { Link, useParams } from 'react-router-dom'
import { useState } from 'react'
import { BriefSection } from '@/components/dashboard/BriefSection'
import { BriefStatusBadge } from '@/components/brief/BriefStatusBadge'
import { BriefWorkflowActions } from '@/components/brief/BriefWorkflowActions'
import { FusionClusterCard } from '@/components/fusion/FusionClusterCard'
import { PageContainer } from '@/components/layout/PageContainer'
import { useDataRefresh } from '@/contexts/DataRefreshContext'
import { getOrderedBriefSections } from '@/intelligence/brief/BriefGenerator'
import { riskLevelClass } from '@/intelligence/brief/BriefScoring'
import { useBrief } from '@/hooks/useBrief'
import { articleDetailPath, ROUTES } from '@/lib/constants'
import { formatDate } from '@/lib/format'
import { safeStringOr } from '@/lib/safeString'
import {
  archiveBrief,
  markBriefReviewed,
  publishBrief,
} from '@/services/dailyBriefService'
import styles from './BriefDetailPage.module.css'

export function BriefDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { notifyDataRefresh } = useDataRefresh()
  const { brief, relatedArticles, relatedClusters, isLoading, error, reload } = useBrief(id)
  const [isProcessing, setIsProcessing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const runWorkflowAction = async (action: 'review' | 'publish' | 'archive') => {
    if (!brief) {
      return
    }

    setIsProcessing(true)
    setActionError(null)

    try {
      if (action === 'review') {
        await markBriefReviewed(brief.id)
      } else if (action === 'publish') {
        await publishBrief(brief.id)
      } else {
        await archiveBrief(brief.id)
      }

      notifyDataRefresh()
      await reload()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Brief workflow action failed')
    } finally {
      setIsProcessing(false)
    }
  }

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
          <BriefStatusBadge status={brief.status} />
          <span className={`${styles.riskBadge} ${styles[riskLevelClass(brief.riskLevel)]}`}>
            {brief.riskLevel} risk
          </span>
          <span className={styles.metaItem}>{brief.importanceScore}% importance</span>
          <span className={styles.metaItem}>{brief.payload.overallConfidence}% confidence</span>
          <time className={styles.metaItem} dateTime={brief.generatedAt}>
            Generated {formatDate(brief.generatedAt)}
          </time>
          {brief.reviewedAt && (
            <span className={styles.metaItem}>Reviewed {formatDate(brief.reviewedAt)}</span>
          )}
          {brief.publishedAt && (
            <span className={styles.metaItem}>Published {formatDate(brief.publishedAt)}</span>
          )}
          {brief.archivedAt && (
            <span className={styles.metaItem}>Archived {formatDate(brief.archivedAt)}</span>
          )}
        </div>

        {actionError && (
          <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">
            {actionError}
          </div>
        )}

        <BriefWorkflowActions
          brief={brief}
          isProcessing={isProcessing}
          onMarkReviewed={() => runWorkflowAction('review')}
          onPublish={() => runWorkflowAction('publish')}
          onArchive={() => runWorkflowAction('archive')}
        />

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
          <h3 className={styles.blockTitle}>Intelligence sections</h3>
          <div className={styles.sections}>
            {sections.map((section) => (
              <BriefSection key={section.id} section={section} />
            ))}
          </div>
        </section>

        <section className={styles.block}>
          <h3 className={styles.blockTitle}>Source breakdown</h3>
          <div className={styles.sourceList}>
            {brief.payload.sourcesUsed.length === 0 ? (
              <p className={styles.text}>No source breakdown available.</p>
            ) : (
              brief.payload.sourcesUsed.map((source) => (
                <div key={source.sourceName} className={styles.sourceRow}>
                  <span>{source.sourceName}</span>
                  <span>{source.articleCount} articles</span>
                </div>
              ))
            )}
          </div>
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
          {brief.payload.relatedEntities.length === 0 ? (
            <p className={styles.text}>No related entities linked to this briefing.</p>
          ) : (
            <div className={styles.chips}>
              {brief.payload.relatedEntities.map((entity) => (
                <span key={`${entity.type}-${entity.label}`} className={styles.chip}>
                  {entity.label} ({entity.type}, {entity.count})
                </span>
              ))}
            </div>
          )}
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
