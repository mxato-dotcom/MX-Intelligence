import { Link } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { useDataRefresh } from '@/contexts/DataRefreshContext'
import { riskLevelClass } from '@/intelligence/brief/BriefScoring'
import { formatDate } from '@/lib/format'
import { briefDetailPath } from '@/lib/constants'
import { generateAndStoreDailyBrief, listDailyBriefHistory } from '@/services/dailyBriefService'
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

  return (
    <PageContainer
      title="Intelligence Briefs"
      description="Browse generated daily intelligence briefings and open prior executive summaries."
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

      {isLoading && !isGenerating && <div className={styles.stateBox}>Loading brief history…</div>}

      {error && !isLoading && !isGenerating && (
        <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">
          {error}
        </div>
      )}

      {!isLoading && !error && !isGenerating && briefs.length === 0 && (
        <div className={styles.stateBox}>
          No briefings generated yet. Click <strong>Generate Brief</strong> or import articles to
          create the first brief.
        </div>
      )}

      {!isLoading && !error && briefs.length > 0 && (
        <div className={styles.list}>
          {briefs.map((brief) => (
            <Link key={brief.id} to={briefDetailPath(brief.id)} className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{brief.title}</h3>
                <span className={`${styles.riskBadge} ${styles[riskLevelClass(brief.riskLevel)]}`}>
                  {brief.riskLevel}
                </span>
              </div>
              <p className={styles.summary}>{brief.summary}</p>
              <div className={styles.meta}>
                <span>{brief.articleCount} articles</span>
                <span>{brief.clusterCount} clusters</span>
                <span>{brief.entityCount} entities</span>
                <span>{brief.payload.overallConfidence}% confidence</span>
                <time dateTime={brief.generatedAt}>{formatDate(brief.generatedAt)}</time>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  )
}
