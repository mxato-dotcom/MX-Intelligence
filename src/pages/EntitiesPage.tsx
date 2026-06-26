import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageContainer } from '@/components/layout/PageContainer'
import { useDataRefresh } from '@/contexts/DataRefreshContext'
import { ENTITY_TYPES, type EntityType } from '@/intelligence/entities/EntityType'
import {
  backfillAllArticles,
  getBackfillStats,
  type BackfillRunResult,
  type BackfillStats,
} from '@/services/entityBackfillService'
import {
  cleanupEntities,
  type EntityCleanupResult,
} from '@/services/entityCleanupService'
import {
  getAggregatedEntities,
  getEntityTypeDistribution,
  getTotalEntityCount,
  type AggregatedEntity,
  type EntityTypeCount,
} from '@/services/entityService'
import styles from './EntitiesPage.module.css'

export function EntitiesPage() {
  const { refreshToken, notifyDataRefresh } = useDataRefresh()
  const [backfillStats, setBackfillStats] = useState<BackfillStats | null>(null)
  const [totalEntities, setTotalEntities] = useState(0)
  const [distribution, setDistribution] = useState<EntityTypeCount[]>([])
  const [entities, setEntities] = useState<AggregatedEntity[]>([])
  const [typeFilter, setTypeFilter] = useState<EntityType | ''>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isBackfilling, setIsBackfilling] = useState(false)
  const [backfillResult, setBackfillResult] = useState<BackfillRunResult | null>(null)
  const [backfillError, setBackfillError] = useState<string | null>(null)
  const [isCleaning, setIsCleaning] = useState(false)
  const [cleanupResult, setCleanupResult] = useState<EntityCleanupResult | null>(null)
  const [cleanupError, setCleanupError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [stats, total, typeDistribution, aggregated] = await Promise.all([
        getBackfillStats(),
        getTotalEntityCount(),
        getEntityTypeDistribution(),
        getAggregatedEntities({
          type: typeFilter || undefined,
          search: searchQuery.trim() || undefined,
          limit: 200,
        }),
      ])

      setBackfillStats(stats)
      setTotalEntities(total)
      setDistribution(typeDistribution)
      setEntities(aggregated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entities')
    } finally {
      setIsLoading(false)
    }
  }, [typeFilter, searchQuery, refreshToken])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleBackfill = async () => {
    setIsBackfilling(true)
    setBackfillError(null)
    setBackfillResult(null)

    try {
      const result = await backfillAllArticles()
      setBackfillResult(result)
      notifyDataRefresh()
      await loadData()
    } catch (err) {
      setBackfillError(err instanceof Error ? err.message : 'Entity backfill failed')
    } finally {
      setIsBackfilling(false)
    }
  }

  const handleCleanup = async () => {
    setIsCleaning(true)
    setCleanupError(null)
    setCleanupResult(null)

    try {
      const result = await cleanupEntities()
      setCleanupResult(result)
      notifyDataRefresh()
      await loadData()
    } catch (err) {
      setCleanupError(err instanceof Error ? err.message : 'Entity cleanup failed')
    } finally {
      setIsCleaning(false)
    }
  }

  return (
    <PageContainer
      title="Entities"
      description="Browse extracted intelligence entities, run backfill, and explore entity coverage."
    >
      <div className={styles.toolbar}>
        <button
          className={styles.cleanupButton}
          type="button"
          onClick={handleCleanup}
          disabled={isCleaning || isBackfilling}
        >
          {isCleaning ? 'Cleaning entities…' : 'Clean & Reclassify Entities'}
        </button>
        <button
          className={styles.backfillButton}
          type="button"
          onClick={handleBackfill}
          disabled={isBackfilling || isCleaning}
        >
          {isBackfilling ? 'Running entity backfill…' : 'Run Entity Backfill'}
        </button>
      </div>

      {isCleaning && (
        <div className={styles.progressBox} role="status" aria-live="polite">
          Scanning stored entities, reclassifying names, and removing low-quality matches…
        </div>
      )}

      {cleanupResult && (
        <div className={styles.successBox}>
          <h3 className={styles.successTitle}>Cleanup complete</h3>
          <p>Entities scanned: {cleanupResult.entitiesScanned}</p>
          <p>Reclassified: {cleanupResult.reclassified}</p>
          <p>Removed: {cleanupResult.removed}</p>
          <p>Merged: {cleanupResult.merged}</p>
          <p>Failed: {cleanupResult.failed}</p>
        </div>
      )}

      {cleanupError && (
        <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">
          {cleanupError}
        </div>
      )}

      {isBackfilling && (
        <div className={styles.progressBox} role="status" aria-live="polite">
          Processing all articles and extracting entities. This may take a moment…
        </div>
      )}

      {backfillResult && (
        <div className={styles.successBox}>
          <h3 className={styles.successTitle}>Backfill complete</h3>
          <p>Articles processed: {backfillResult.articlesProcessed}</p>
          <p>Entities extracted: {backfillResult.entitiesExtracted}</p>
          <p>Duplicates skipped: {backfillResult.duplicatesSkipped}</p>
          <p>Failed: {backfillResult.failed}</p>
        </div>
      )}

      {backfillError && (
        <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">
          {backfillError}
        </div>
      )}

      {isLoading && <div className={styles.stateBox}>Loading entities…</div>}

      {error && (
        <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Total Entities</p>
              <p className={styles.statValue}>{totalEntities}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Total Articles</p>
              <p className={styles.statValue}>{backfillStats?.totalArticles ?? 0}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Articles With Entities</p>
              <p className={styles.statValue}>{backfillStats?.articlesWithEntities ?? 0}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Pending Backfill</p>
              <p className={styles.statValue}>{backfillStats?.articlesPendingBackfill ?? 0}</p>
            </div>
          </div>

          <div className={styles.filters}>
            <label className={styles.filterField}>
              <span className={styles.filterLabel}>Filter by type</span>
              <select
                className={styles.select}
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as EntityType | '')}
              >
                <option value="">All types</option>
                {ENTITY_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>

            <label className={styles.filterField}>
              <span className={styles.filterLabel}>Search entities</span>
              <input
                className={styles.searchInput}
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name or keyword"
              />
            </label>
          </div>

          {distribution.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Entity type distribution</h3>
              <div className={styles.distributionGrid}>
                {distribution.map((entry) => (
                  <div key={entry.entityType} className={styles.distributionItem}>
                    <span className={styles.distributionType}>{entry.entityType}</span>
                    <span className={styles.distributionCount}>{entry.count}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Top entities</h3>

            {entities.length === 0 ? (
              <div className={styles.stateBox}>No entities match your filters.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Entity</th>
                      <th className={styles.th}>Type</th>
                      <th className={styles.th}>Mentions</th>
                      <th className={styles.th}>Articles</th>
                      <th className={styles.th}>Avg confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entities.map((entity) => (
                      <tr key={`${entity.entityType}-${entity.normalizedText}`} className={styles.row}>
                        <td className={styles.cell}>{entity.displayText}</td>
                        <td className={styles.cell}>{entity.entityType}</td>
                        <td className={styles.cell}>{entity.mentionCount}</td>
                        <td className={styles.cell}>{entity.articleCount}</td>
                        <td className={styles.cell}>{entity.averageConfidence}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Related articles</h3>
            <p className={styles.sectionHint}>
              Use article counts in the table above to identify how many articles reference each entity.
              Open individual articles from the{' '}
              <Link to="/articles">Articles</Link> page to review extracted entity groupings.
            </p>
            {entities.slice(0, 5).map((entity) => (
              <p key={`${entity.entityType}-${entity.normalizedText}-hint`} className={styles.relatedHint}>
                <strong>{entity.displayText}</strong> ({entity.entityType}) — {entity.articleCount} related article
                {entity.articleCount === 1 ? '' : 's'}
              </p>
            ))}
          </section>
        </>
      )}
    </PageContainer>
  )
}
