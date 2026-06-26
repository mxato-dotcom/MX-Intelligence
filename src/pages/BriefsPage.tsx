import { Link } from 'react-router-dom'
import { PageContainer } from '@/components/layout/PageContainer'
import { useDataRefresh } from '@/contexts/DataRefreshContext'
import { riskLevelClass } from '@/intelligence/brief/BriefScoring'
import { formatDate } from '@/lib/format'
import { briefDetailPath } from '@/lib/constants'
import { listDailyBriefHistory } from '@/services/dailyBriefService'
import type { IntelligenceDailyBrief } from '@/intelligence/brief/BriefTypes'
import { useEffect, useState } from 'react'
import styles from './BriefsPage.module.css'

export function BriefsPage() {
  const { refreshToken } = useDataRefresh()
  const [briefs, setBriefs] = useState<IntelligenceDailyBrief[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const history = await listDailyBriefHistory(50)
        if (isMounted) {
          setBriefs(history)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load brief history')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [refreshToken])

  return (
    <PageContainer
      title="Intelligence Briefs"
      description="Browse generated daily intelligence briefings and open prior executive summaries."
    >
      {isLoading && <div className={styles.stateBox}>Loading brief history…</div>}

      {error && (
        <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">
          {error}
        </div>
      )}

      {!isLoading && !error && briefs.length === 0 && (
        <div className={styles.stateBox}>
          No briefings generated yet. Import articles or run a sync to create the first brief.
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
