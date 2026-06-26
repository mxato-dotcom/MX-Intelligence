import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  articleDetailPath,
  briefDetailPath,
  entityDetailPath,
  sourceDetailPath,
} from '@/lib/constants'
import type { GraphData, GraphEdge, GraphNode } from '@/types/graph'
import styles from './GraphExplorer.module.css'

interface GraphExplorerProps {
  graph: GraphData
  initialNodeId?: string
  compact?: boolean
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
    const normalized = String(node.metadata?.normalizedText ?? node.label)
    return entityDetailPath(normalized)
  }

  return null
}

function formatEdgeType(type: GraphEdge['type']): string {
  return type.replace(/_/g, ' ')
}

export function GraphExplorer({ graph, initialNodeId, compact = false }: GraphExplorerProps) {
  const [selectedNodeId, setSelectedNodeId] = useState(initialNodeId ?? graph.nodes[0]?.id ?? '')
  const [listFilter, setListFilter] = useState('')

  const filteredListNodes = useMemo(() => {
    const needle = listFilter.trim().toLowerCase()
    const nodes = graph.nodes.filter((node) => node.type === 'entity' || node.type === 'article' || node.type === 'source')

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
  }, [graph.nodes, listFilter, compact])

  const selectedNode = graph.nodes.find((node) => node.id === selectedNodeId) ?? null

  const connectedEdges = useMemo(() => {
    if (!selectedNodeId) {
      return []
    }

    return graph.edges.filter(
      (edge) => edge.sourceId === selectedNodeId || edge.targetId === selectedNodeId,
    )
  }, [graph.edges, selectedNodeId])

  const connectedNodes = useMemo(() => {
    const ids = new Set<string>()
    for (const edge of connectedEdges) {
      ids.add(edge.sourceId)
      ids.add(edge.targetId)
    }

    if (selectedNodeId) {
      ids.delete(selectedNodeId)
    }

    return graph.nodes.filter((node) => ids.has(node.id))
  }, [connectedEdges, graph.nodes, selectedNodeId])

  if (graph.nodes.length === 0) {
    return (
      <div className={styles.empty}>
        No graph nodes yet. Import articles, extract entities, or generate briefs to build relationships.
      </div>
    )
  }

  return (
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
                    const otherNode = graph.nodes.find((node) => node.id === otherId)

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
  )
}
