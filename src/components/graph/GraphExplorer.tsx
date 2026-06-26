import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { EntityType } from '@/intelligence/entities/EntityType'
import { truncateGraph } from '@/intelligence/graph/graphTruncate'
import {
  ALL_EDGE_TYPES,
  ALL_NODE_TYPES,
} from '@/intelligence/graph/graphStyles'
import { GraphControls } from '@/components/graph/GraphControls'
import { GraphLegend } from '@/components/graph/GraphLegend'
import { GraphNodeDetails } from '@/components/graph/GraphNodeDetails'
import { KnowledgeGraphCanvas } from '@/components/graph/KnowledgeGraphCanvas'
import {
  articleDetailPath,
  briefDetailPath,
  entityDetailPath,
  sourceDetailPath,
} from '@/lib/constants'
import type { GraphData, GraphEdge, GraphNode, GraphEdgeType, GraphNodeType } from '@/types/graph'
import styles from './GraphExplorer.module.css'

interface GraphExplorerProps {
  graph: GraphData
  initialNodeId?: string
  compact?: boolean
  maxNodes?: number
  maxEdges?: number
  centerNodeId?: string
  showListPanels?: boolean
}

function nodeRoute(node: GraphNode): string | null {
  if (node.type === 'article') {
    return articleDetailPath(node.id.replace('article:', ''))
  }

  if (node.type === 'source') {
    return sourceDetailPath(node.id.replace('source:', ''))
  }

  if (node.type === 'brief') {
    return briefDetailPath(node.id.replace('brief:', ''))
  }

  if (node.type === 'entity') {
    const entityType = String(node.metadata?.entityType ?? node.sublabel ?? 'Keyword') as EntityType
    const normalized = String(node.metadata?.normalizedText ?? node.label)
    return entityDetailPath(entityType, normalized)
  }

  return null
}

function formatEdgeType(type: GraphEdge['type']): string {
  return type.replace(/_/g, ' ')
}

export function GraphExplorer({
  graph,
  initialNodeId,
  compact = false,
  maxNodes = 100,
  maxEdges = 200,
  centerNodeId,
  showListPanels = true,
}: GraphExplorerProps) {
  const focusCenterId = centerNodeId ?? initialNodeId

  const truncatedResult = useMemo(
    () =>
      truncateGraph(graph, {
        maxNodes: compact ? Math.min(maxNodes, 60) : maxNodes,
        maxEdges: compact ? Math.min(maxEdges, 120) : maxEdges,
        centerNodeId: focusCenterId,
      }),
    [graph, compact, maxNodes, maxEdges, focusCenterId],
  )

  const displayGraph = truncatedResult.graph

  const [selectedNodeId, setSelectedNodeId] = useState(
    initialNodeId ?? focusCenterId ?? displayGraph.nodes[0]?.id ?? '',
  )
  const [listFilter, setListFilter] = useState('')
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [activeNodeTypes, setActiveNodeTypes] = useState<Set<GraphNodeType>>(
    () => new Set(ALL_NODE_TYPES),
  )
  const [activeEdgeTypes, setActiveEdgeTypes] = useState<Set<GraphEdgeType>>(
    () => new Set(ALL_EDGE_TYPES),
  )

  useEffect(() => {
    if (initialNodeId || focusCenterId) {
      setSelectedNodeId(initialNodeId ?? focusCenterId ?? '')
    }
  }, [initialNodeId, focusCenterId])

  const toggleNodeType = useCallback((type: GraphNodeType) => {
    setActiveNodeTypes((current) => {
      const next = new Set(current)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }, [])

  const toggleEdgeType = useCallback((type: GraphEdgeType) => {
    setActiveEdgeTypes((current) => {
      const next = new Set(current)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }, [])

  const resetView = useCallback(() => {
    setZoom(1)
    setPanX(0)
    setPanY(0)
  }, [])

  const filteredListNodes = useMemo(() => {
    const needle = listFilter.trim().toLowerCase()
    const nodes = displayGraph.nodes.filter(
      (node) =>
        activeNodeTypes.has(node.type) &&
        (node.type === 'entity' || node.type === 'article' || node.type === 'source'),
    )

    if (!needle) {
      return nodes.slice(0, compact ? 30 : 80)
    }

    return nodes
      .filter(
        (node) =>
          node.label.toLowerCase().includes(needle) ||
          (node.sublabel?.toLowerCase().includes(needle) ?? false),
      )
      .slice(0, compact ? 20 : 80)
  }, [displayGraph.nodes, listFilter, compact, activeNodeTypes])

  const selectedNode = displayGraph.nodes.find((node) => node.id === selectedNodeId) ?? null

  const connectedEdges = useMemo(() => {
    if (!selectedNodeId) {
      return []
    }

    return displayGraph.edges.filter(
      (edge) =>
        activeEdgeTypes.has(edge.type) &&
        (edge.sourceId === selectedNodeId || edge.targetId === selectedNodeId),
    )
  }, [displayGraph.edges, selectedNodeId, activeEdgeTypes])

  const connectedNodes = useMemo(() => {
    const ids = new Set<string>()
    for (const edge of connectedEdges) {
      ids.add(edge.sourceId)
      ids.add(edge.targetId)
    }

    if (selectedNodeId) {
      ids.delete(selectedNodeId)
    }

    return displayGraph.nodes.filter((node) => ids.has(node.id))
  }, [connectedEdges, displayGraph.nodes, selectedNodeId])

  const connectionCount = connectedEdges.length

  if (graph.nodes.length === 0) {
    return (
      <div className={styles.empty}>
        No graph nodes yet. Import articles, extract entities, or generate briefs to build relationships.
      </div>
    )
  }

  return (
    <div className={`${styles.explorerRoot} ${compact ? styles.compactRoot : ''}`}>
      {truncatedResult.truncated && (
        <p className={styles.truncatedNotice}>
          Showing top {displayGraph.nodes.length} of {truncatedResult.totalNodes} nodes and{' '}
          {displayGraph.edges.length} of {truncatedResult.totalEdges} edges for performance.
        </p>
      )}

      <GraphControls
        activeNodeTypes={activeNodeTypes}
        activeEdgeTypes={activeEdgeTypes}
        onToggleNodeType={toggleNodeType}
        onToggleEdgeType={toggleEdgeType}
        onZoomIn={() => setZoom((value) => Math.min(2.5, value + 0.15))}
        onZoomOut={() => setZoom((value) => Math.max(0.4, value - 0.15))}
        onResetView={resetView}
        compact={compact}
      />

      <div className={styles.visualRow}>
        <KnowledgeGraphCanvas
          graph={displayGraph}
          centerNodeId={focusCenterId}
          compact={compact}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          activeNodeTypes={activeNodeTypes}
          activeEdgeTypes={activeEdgeTypes}
          zoom={zoom}
          panX={panX}
          panY={panY}
          onPanChange={(x, y) => {
            setPanX(x)
            setPanY(y)
          }}
          onZoomChange={setZoom}
        />
        <GraphNodeDetails
          node={selectedNode}
          connectionCount={connectionCount}
          connectedEdges={connectedEdges}
          connectedNodes={connectedNodes}
          onSelectNode={setSelectedNodeId}
          compact={compact}
        />
      </div>

      {!compact && <GraphLegend activeNodeTypes={activeNodeTypes} activeEdgeTypes={activeEdgeTypes} />}

      {showListPanels && (
        <div className={`${styles.explorer} ${compact ? styles.compact : ''}`}>
          <aside className={styles.leftPanel}>
            <h4 className={styles.panelTitle}>Nodes</h4>
            <input
              className={styles.searchInput}
              type="search"
              value={listFilter}
              onChange={(event) => setListFilter(event.target.value)}
              placeholder="Filter entities, articles, sources…"
            />
            <ul className={styles.nodeList}>
              {filteredListNodes.map((node) => (
                <li key={node.id}>
                  <button
                    type="button"
                    className={`${styles.nodeButton} ${node.id === selectedNodeId ? styles.nodeButtonActive : ''}`}
                    onClick={() => setSelectedNodeId(node.id)}
                  >
                    <span className={styles.nodeLabel}>{node.label}</span>
                    <span className={styles.nodeMeta}>{node.type} · {node.sublabel ?? '—'}</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section className={styles.centerPanel}>
            {selectedNode ? (
              <>
                <div className={styles.selectedHeader}>
                  <h4 className={styles.selectedTitle}>{selectedNode.label}</h4>
                  <p className={styles.selectedMeta}>
                    {selectedNode.type}
                    {selectedNode.sublabel ? ` · ${selectedNode.sublabel}` : ''}
                  </p>
                  {nodeRoute(selectedNode) && (
                    <Link to={nodeRoute(selectedNode)!} className={styles.detailLink}>
                      Open detail
                    </Link>
                  )}
                </div>

                <div className={styles.relationshipSection}>
                  <h5 className={styles.sectionHeading}>Relationships</h5>
                  {connectedEdges.length === 0 ? (
                    <p className={styles.emptyInline}>No relationships for this node.</p>
                  ) : (
                    <div className={styles.relationshipCards}>
                      {connectedEdges.map((edge) => {
                        const otherId =
                          edge.sourceId === selectedNodeId ? edge.targetId : edge.sourceId
                        const otherNode = displayGraph.nodes.find((node) => node.id === otherId)

                        return (
                          <div key={edge.id} className={styles.relationshipCard}>
                            <p className={styles.relationshipType}>{formatEdgeType(edge.type)}</p>
                            <p className={styles.relationshipTarget}>
                              {otherNode?.label ?? otherId}
                            </p>
                            <div className={styles.relationshipMetrics}>
                              <span>Weight {edge.weight}</span>
                              <span>Confidence {edge.confidence}%</span>
                              <span>Evidence {edge.evidenceCount}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className={styles.emptyInline}>Select a node to inspect relationships.</p>
            )}
          </section>

          <aside className={styles.rightPanel}>
            <h4 className={styles.panelTitle}>Connected nodes</h4>
            {connectedNodes.length === 0 ? (
              <p className={styles.emptyInline}>No connected nodes.</p>
            ) : (
              <ul className={styles.connectedList}>
                {connectedNodes.map((node) => {
                  const route = nodeRoute(node)
                  return (
                    <li key={node.id} className={styles.connectedItem}>
                      {route ? (
                        <Link to={route} className={styles.connectedLink}>
                          <span className={styles.nodeLabel}>{node.label}</span>
                          <span className={styles.nodeMeta}>{node.type}</span>
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className={styles.connectedButton}
                          onClick={() => setSelectedNodeId(node.id)}
                        >
                          <span className={styles.nodeLabel}>{node.label}</span>
                          <span className={styles.nodeMeta}>{node.type}</span>
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
