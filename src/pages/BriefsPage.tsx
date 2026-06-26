import { useCallback, useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { BriefStatusBadge } from '@/components/brief/BriefStatusBadge'
import { BriefWorkflowActions } from '@/components/brief/BriefWorkflowActions'
import { useDataRefresh } from '@/contexts/DataRefreshContext'
import { riskLevelClass } from '@/intelligence/brief/BriefScoring'
import { formatDate } from '@/lib/format'
import {
  archiveBrief,
  generateAndStoreDailyBrief,
  listDailyBriefHistory,
  markBriefReviewed,
  publishBrief,
} from '@/services/dailyBriefService'
import type { IntelligenceDailyBrief } from '@/intelligence/brief/BriefTypes'
import styles from './BriefsPage.module.css'

export function BriefsPage() {
  const { refreshToken, notifyDataRefresh } = useDataRefresh()
  const [briefs, setBriefs] = useState<IntelligenceDailyBrief[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const loadBriefs = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const history = await listDailyBriefHistory(50)
      setBriefs(history)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load brief history')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBriefs()
  }, [loadBriefs, refreshToken])

  const handleGenerateBrief = async () => {
    setIsGenerating(true)
    setGenerateError(null)
    setGenerateSuccess(null)
    setActionError(null)

    try {
      const brief = await generateAndStoreDailyBrief()

      if (!brief) {
        setGenerateError(
          'Brief could not be saved. Run the daily_briefs migration in Supabase and try again.',
        )
        return
      }

      setGenerateSuccess(`Brief generated successfully: ${brief.title}`)
      notifyDataRefresh()
      await loadBriefs()
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate brief')
    } finally {
      setIsGenerating(false)
    }
  }

  const runWorkflowAction = async (
    id: string,
    action: 'review' | 'publish' | 'archive',
  ) => {
    setProcessingId(id)
    setActionError(null)

    try {
      if (action === 'review') {
        await markBriefReviewed(id)
      } else if (action === 'publish') {
        await publishBrief(id)
      } else {
        await archiveBrief(id)
      }

      notifyDataRefresh()
      await loadBriefs()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Brief workflow action failed')
    } finally {
      setProcessingId(null)
    }
  }

  const showEmptyState =
    !isLoading && !error && !isGenerating && briefs.length === 0

  return (
    <PageContainer
      title="Intelligence Briefs"
      description="Review, publish, and archive daily intelligence reports."
      actions={
        <button
          className={styles.generateButton}
          type="button"
          onClick={handleGenerateBrief}
          disabled={isGenerating || isLoading}
        >
          {isGenerating ? 'Generating brief…' : 'Generate Brief'}
        </button>
      }
    >
      {isGenerating && (
        <div className={styles.stateBox}>Generating intelligence brief from current data…</div>
      )}

      {generateSuccess && !isGenerating && (
        <div className={styles.stateBoxSuccess} role="status">{generateSuccess}</div>
      )}

      {generateError && !isGenerating && (
        <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">
          {generateError}
        </div>
      )}

      {actionError && (
        <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">
          {actionError}
        </div>
      )}

      {isLoading && !isGenerating && <div className={styles.stateBox}>Loading brief history…</div>}

      {error && !isLoading && !isGenerating && (
        <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">
          {error}
        </div>
      )}

      {showEmptyState && (
        <div className={styles.emptyState}>
          <h3 className={styles.emptyTitle}>No intelligence briefs yet</h3>
          <p className={styles.emptyText}>
            Generate your first executive briefing from imported articles, fusion clusters, and
            extracted entities.
          </p>
          <button
            className={styles.generateButton}
            type="button"
            onClick={handleGenerateBrief}
            disabled={isGenerating}
          >
            Generate Brief
          </button>
        </div>
      )}

      {!isLoading && !error && briefs.length > 0 && (
        <div className={styles.list}>
          {briefs.map((brief) => (
            <article key={brief.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleBlock}>
                  <h3 className={styles.cardTitle}>{brief.title}</h3>
                  <time className={styles.cardDate} dateTime={brief.generatedAt}>
                    {formatDate(brief.generatedAt)}
                  </time>
                </div>
                <div className={styles.badges}>
                  <BriefStatusBadge status={brief.status} />
                  <span className={`${styles.riskBadge} ${styles[riskLevelClass(brief.riskLevel)]}`}>
                    {brief.riskLevel}
                  </span>
                </div>
              </div>

              <p className={styles.summary}>{brief.summary}</p>

              <div className={styles.statsGrid}>
                <span>{brief.importanceScore}% importance</span>
                <span>{brief.articleCount} articles</span>
                <span>{brief.clusterCount} clusters</span>
                <span>{brief.entityCount} entities</span>
                <span>{brief.payload.overallConfidence}% confidence</span>
              </div>

              <BriefWorkflowActions
                brief={brief}
                isProcessing={processingId === brief.id}
                onMarkReviewed={(briefId) => runWorkflowAction(briefId, 'review')}
                onPublish={(briefId) => runWorkflowAction(briefId, 'publish')}
                onArchive={(briefId) => runWorkflowAction(briefId, 'archive')}
              />
            </article>
          ))}
        </div>
      )}
    </PageContainer>
  )
}
