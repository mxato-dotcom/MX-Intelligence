import { useCallback, useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { GraphExplorer } from '@/components/graph/GraphExplorer'
import { useDataRefresh } from '@/contexts/DataRefreshContext'
import { getGraph, getGraphStats, searchGraph } from '@/services/graphService'
import type { GraphData, GraphStats } from '@/types/graph'
import styles from './GraphPage.module.css'

export function GraphPage() {
  const { refreshToken } = useDataRefresh()
  const [graph, setGraph] = useState<GraphData | null>(null)
  const [stats, setStats] = useState<GraphStats | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadGraph = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const fullGraph = await getGraph(true)
      const displayGraph = searchQuery.trim()
        ? await searchGraph(searchQuery)
        : fullGraph

      setGraph(displayGraph)
      setStats(getGraphStats(fullGraph))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load relationship graph')
      setGraph({ nodes: [], edges: [], builtAt: new Date().toISOString() })
      setStats({
        totalNodes: 0,
        totalEdges: 0,
        topConnectedEntity: null,
        strongestRelationship: null,
      })
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    loadGraph()
  }, [loadGraph, refreshToken])

  return (
    <PageContainer
      title="Relationship Graph"
      description="Explore how entities, articles, clusters, briefs, and sources connect across your intelligence data."
    >
      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search graph nodes…"
        />
      </div>

      {isLoading && <div className={styles.stateBox}>Building relationship graph…</div>}

      {error && (
        <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">
          {error}
        </div>
      )}

      {!isLoading && stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Total Nodes</p>
            <p className={styles.statValue}>{stats.totalNodes}</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Total Edges</p>
            <p className={styles.statValue}>{stats.totalEdges}</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Top Connected Entity</p>
            <p className={styles.statValueSmall}>
              {stats.topConnectedEntity?.label ?? '—'}
            </p>
            {stats.topConnectedEntity && (
              <p className={styles.statSubvalue}>
                {stats.topConnectedEntity.connectionCount} connections
              </p>
            )}
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Strongest Relationship</p>
            <p className={styles.statValueSmall}>
              {stats.strongestRelationship
                ? `${stats.strongestRelationship.sourceLabel} ↔ ${stats.strongestRelationship.targetLabel}`
                : '—'}
            </p>
            {stats.strongestRelationship && (
              <p className={styles.statSubvalue}>
                Weight {stats.strongestRelationship.weight} · {stats.strongestRelationship.evidenceCount} evidence
              </p>
            )}
          </div>
        </div>
      )}

      {!isLoading && graph && (
        <section className={styles.explorerSection}>
          <GraphExplorer graph={graph} />
        </section>
      )}
    </PageContainer>
  )
}
