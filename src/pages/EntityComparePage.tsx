import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageContainer } from '@/components/layout/PageContainer'
import { entityProfilePath } from '@/lib/constants'
import {
  compareEntities,
  listEntityOptions,
} from '@/services/entityProfileService'
import type { EntityCompareResult } from '@/types/entityProfile'
import type { EntityType } from '@/intelligence/entities/EntityType'
import styles from './EntityComparePage.module.css'

export function EntityComparePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [options, setOptions] = useState<
    Array<{ entityId: string; displayText: string; entityType: EntityType }>
  >([])
  const [entityA, setEntityA] = useState(searchParams.get('a') ?? '')
  const [entityB, setEntityB] = useState(searchParams.get('b') ?? '')
  const [result, setResult] = useState<EntityCompareResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listEntityOptions().then(setOptions).catch(() => setOptions([]))
  }, [])

  const runCompare = useCallback(async () => {
    if (!entityA || !entityB) {
      setResult(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const comparison = await compareEntities(entityA, entityB)
      setResult(comparison)
      setSearchParams({ a: entityA, b: entityB })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare entities')
      setResult(null)
    } finally {
      setIsLoading(false)
    }
  }, [entityA, entityB, setSearchParams])

  useEffect(() => {
    if (entityA && entityB) {
      runCompare()
    }
  }, [entityA, entityB, runCompare])

  return (
    <PageContainer
      title="Compare Entities"
      description="Compare mentions, coverage, trust, and shared intelligence context."
    >
      <div className={styles.selectors}>
        <label className={styles.field}>
          <span className={styles.label}>Entity A</span>
          <select
            className={styles.select}
            value={entityA}
            onChange={(event) => setEntityA(event.target.value)}
          >
            <option value="">Select entity…</option>
            {options.map((option) => (
              <option key={option.entityId} value={option.entityId}>
                {option.displayText} ({option.entityType})
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Entity B</span>
          <select
            className={styles.select}
            value={entityB}
            onChange={(event) => setEntityB(event.target.value)}
          >
            <option value="">Select entity…</option>
            {options.map((option) => (
              <option key={option.entityId} value={option.entityId}>
                {option.displayText} ({option.entityType})
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading && <div className={styles.stateBox}>Comparing entities…</div>}
      {error && <div className={`${styles.stateBox} ${styles.error}`} role="alert">{error}</div>}

      {result && !isLoading && (
        <>
          <div className={styles.compareGrid}>
            <CompareColumn title="Entity A" snapshot={result.entityA} />
            <CompareColumn title="Entity B" snapshot={result.entityB} />
          </div>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Shared Articles ({result.sharedArticles.length})</h3>
            {result.sharedArticles.length === 0 ? (
              <p className={styles.empty}>No shared articles.</p>
            ) : (
              <ul className={styles.list}>
                {result.sharedArticles.map((article) => (
                  <li key={article.id}>{article.title} — {article.source}</li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Shared Clusters ({result.sharedClusters.length})</h3>
            {result.sharedClusters.length === 0 ? (
              <p className={styles.empty}>No shared clusters.</p>
            ) : (
              <ul className={styles.list}>
                {result.sharedClusters.map((cluster) => (
                  <li key={cluster.id}>{cluster.title}</li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Shared Relationships</h3>
            {result.sharedRelationships.length === 0 ? (
              <p className={styles.empty}>No shared entity relationships.</p>
            ) : (
              <ul className={styles.list}>
                {result.sharedRelationships.map((relationship) => (
                  <li key={relationship.entityId}>
                    <Link to={entityProfilePath(relationship.entityId)} className={styles.link}>
                      {relationship.entityLabel}
                    </Link>
                    {' '}
                    ({relationship.entityType}) — A: {relationship.weightA} · B: {relationship.weightB}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </PageContainer>
  )
}

function CompareColumn({
  title,
  snapshot,
}: {
  title: string
  snapshot: EntityCompareResult['entityA']
}) {
  return (
    <div className={styles.column}>
      <h3 className={styles.columnTitle}>{title}</h3>
      <p className={styles.entityName}>
        <Link to={entityProfilePath(snapshot.entityId)} className={styles.link}>
          {snapshot.displayText}
        </Link>
      </p>
      <p className={styles.meta}>Type: {snapshot.entityType}</p>
      <p className={styles.meta}>Mentions: {snapshot.mentions}</p>
      <p className={styles.meta}>Articles: {snapshot.articles}</p>
      <p className={styles.meta}>Clusters: {snapshot.clusters}</p>
      <p className={styles.meta}>Trust: {snapshot.averageTrust}</p>
      <p className={styles.meta}>Confidence: {snapshot.averageConfidence}%</p>
      <p className={styles.meta}>Sources: {snapshot.sources.join(', ') || '—'}</p>
    </div>
  )
}
