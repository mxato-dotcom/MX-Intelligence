import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageContainer } from '@/components/layout/PageContainer'
import { GraphExplorer } from '@/components/graph/GraphExplorer'
import { useDataRefresh } from '@/contexts/DataRefreshContext'
import { articleDetailPath, ROUTES } from '@/lib/constants'
import { getEntityGraph, getEntityProfile } from '@/services/graphService'
import type { EntityProfileData, GraphData } from '@/types/graph'
import styles from './EntityProfilePage.module.css'

export function EntityProfilePage() {
  const { normalizedText: encodedText } = useParams<{ normalizedText: string }>()
  const normalizedText = decodeURIComponent(encodedText ?? '')
  const { refreshToken } = useDataRefresh()

  const [profile, setProfile] = useState<EntityProfileData | null>(null)
  const [graph, setGraph] = useState<GraphData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    if (!normalizedText) {
      setProfile(null)
      setGraph(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [profileData, entityGraph] = await Promise.all([
        getEntityProfile(normalizedText),
        getEntityGraph(normalizedText),
      ])

      setProfile(profileData)
      setGraph(entityGraph)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entity profile')
    } finally {
      setIsLoading(false)
    }
  }, [normalizedText])

  useEffect(() => {
    loadProfile()
  }, [loadProfile, refreshToken])

  if (isLoading) {
    return (
      <PageContainer title="Entity Profile" description="Loading entity relationships…">
        <div className={styles.stateBox}>Loading entity profile…</div>
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer title="Entity Profile" description="Entity relationship profile">
        <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">{error}</div>
      </PageContainer>
    )
  }

  if (!profile) {
    return (
      <PageContainer title="Entity Profile" description="Entity relationship profile">
        <div className={styles.stateBox}>
          Entity not found. Return to the{' '}
          <Link to={ROUTES.ENTITIES}>Entities</Link> page to browse extracted entities.
        </div>
      </PageContainer>
    )
  }

  const entityNodeId = graph?.nodes.find(
    (node) =>
      node.type === 'entity' &&
      String(node.metadata?.normalizedText ?? '').toLowerCase() === profile.normalizedText,
  )?.id

  return (
    <PageContainer
      title={profile.displayText}
      description={`${profile.entityType} entity profile and relationship graph`}
    >
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Entity Type</p>
          <p className={styles.statValueSmall}>{profile.entityType}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Mentions</p>
          <p className={styles.statValue}>{profile.mentionCount}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Related Articles</p>
          <p className={styles.statValue}>{profile.articleCount}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Avg Confidence</p>
          <p className={styles.statValue}>{profile.averageConfidence}%</p>
        </div>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Related articles</h3>
        {profile.relatedArticles.length === 0 ? (
          <p className={styles.empty}>No related articles found.</p>
        ) : (
          <ul className={styles.list}>
            {profile.relatedArticles.map((article) => (
              <li key={article.id}>
                <Link to={articleDetailPath(article.id)} className={styles.listLink}>
                  <span>{article.title}</span>
                  <span className={styles.listMeta}>{article.source}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Related entities</h3>
        {profile.relatedEntities.length === 0 ? (
          <p className={styles.empty}>No co-occurring entities yet.</p>
        ) : (
          <ul className={styles.chipList}>
            {profile.relatedEntities.map((entity) => (
              <li key={`${entity.entityType}-${entity.normalizedText}`}>
                <Link
                  to={`/entities/${encodeURIComponent(entity.normalizedText)}`}
                  className={styles.chip}
                >
                  {entity.entityLabel}
                  <span className={styles.chipMeta}>
                    {entity.entityType} · {entity.connectionCount} links
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Related clusters</h3>
        {profile.relatedClusters.length === 0 ? (
          <p className={styles.empty}>No fusion clusters linked to this entity.</p>
        ) : (
          <ul className={styles.list}>
            {profile.relatedClusters.map((cluster) => (
              <li key={cluster.id} className={styles.clusterItem}>
                <span>{cluster.title}</span>
                <span className={styles.listMeta}>{cluster.confidenceScore}% confidence</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Relationship graph</h3>
        {graph && graph.nodes.length > 0 ? (
          <GraphExplorer graph={graph} initialNodeId={entityNodeId} compact />
        ) : (
          <p className={styles.empty}>No graph relationships available for this entity.</p>
        )}
      </section>
    </PageContainer>
  )
}
