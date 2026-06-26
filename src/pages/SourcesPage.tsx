import { Link } from 'react-router-dom'
import { SourceList } from '@/components/sources/SourceList'
import { PageContainer } from '@/components/layout/PageContainer'
import { useSources } from '@/hooks/useSources'
import { ROUTES } from '@/lib/constants'
import type { Source } from '@/types/source'
import styles from './SourcesPage.module.css'

function computeStats(sources: Source[]) {
  const total = sources.length
  const enabled = sources.filter((s) => s.status === 'enabled').length
  const disabled = sources.filter((s) => s.status === 'disabled').length
  const avgTrust =
    total === 0
      ? 0
      : Math.round(sources.reduce((sum, s) => sum + s.trust_score, 0) / total)

  return { total, enabled, disabled, avgTrust }
}

export function SourcesPage() {
  const { sources, isLoading, error, refetch } = useSources()
  const stats = computeStats(sources)

  return (
    <PageContainer
      title="Sources"
      description="Manage intelligence sources for automated monitoring and ingestion."
      actions={
        <div className={styles.headerActions}>
          <Link to={ROUTES.CONNECTORS} className={styles.browseButton}>
            Browse Connectors
          </Link>
          <Link to={ROUTES.SOURCES_NEW} className={styles.newButton}>
            New Source
          </Link>
        </div>
      }
    >
      {isLoading && <div className={styles.stateBox}>Loading sources…</div>}

      {error && (
        <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Total Sources</p>
              <p className={styles.statValue}>{stats.total}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Enabled Sources</p>
              <p className={styles.statValue}>{stats.enabled}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Disabled Sources</p>
              <p className={styles.statValue}>{stats.disabled}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Average Trust Score</p>
              <p className={styles.statValue}>{stats.avgTrust}</p>
            </div>
          </div>

          {sources.length === 0 ? (
            <div className={styles.stateBox}>
              No sources yet. <Link to={ROUTES.SOURCES_NEW}>Add your first source</Link>.
            </div>
          ) : (
            <SourceList sources={sources} onSourceUpdated={refetch} />
          )}
        </>
      )}
    </PageContainer>
  )
}
