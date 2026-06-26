import { Link } from 'react-router-dom'
import type { EntityType } from '@/intelligence/entities/EntityType'
import {
  NODE_TYPE_COLORS,
  getNodeMetric,
  truncateLabel,
} from '@/intelligence/graph/graphStyles'
import {
  articleDetailPath,
  briefDetailPath,
  entityDetailPath,
  sourceDetailPath,
} from '@/lib/constants'
import type { GraphEdge, GraphNode } from '@/types/graph'
import styles from './GraphNodeDetails.module.css'

interface GraphNodeDetailsProps {
  node: GraphNode | null
  connectionCount: number
  connectedEdges: GraphEdge[]
  connectedNodes: GraphNode[]
  onSelectNode?: (nodeId: string) => void
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
    const entityType = String(node.metadata?.entityType ?? node.sublabel ?? 'Keyword') as EntityType
    const normalized = String(node.metadata?.normalizedText ?? node.label)
    return entityDetailPath(entityType, normalized)
  }

  return null
}

function formatEdgeType(type: GraphEdge['type']): string {
  return type.replace(/_/g, ' ')
}

export function GraphNodeDetails({
  node,
  connectionCount,
  connectedEdges,
  connectedNodes,
  onSelectNode,
  compact = false,
}: GraphNodeDetailsProps) {
  if (!node) {
    return (
      <aside className={`${styles.panel} ${compact ? styles.compact : ''}`}>
        <p className={styles.empty}>Select a node on the graph to inspect details.</p>
      </aside>
    )
  }

  const metric = getNodeMetric(node)
  const detailRoute = nodeRoute(node)

  return (
    <aside className={`${styles.panel} ${compact ? styles.compact : ''}`}>
      <div className={styles.header}>
        <span
          className={styles.typeBadge}
          style={{ background: NODE_TYPE_COLORS[node.type] }}
        >
          {node.type}
        </span>
        <h4 className={styles.title}>{node.label}</h4>
        {node.sublabel && <p className={styles.subtitle}>{node.sublabel}</p>}
      </div>

      <div className={styles.metrics}>
        <span>{connectionCount} connections</span>
        {metric !== null && <span>{metric}% score</span>}
      </div>

      {detailRoute && (
        <Link to={detailRoute} className={styles.detailLink}>
          Open detail page
        </Link>
      )}

      {!compact && connectedEdges.length > 0 && (
        <div className={styles.section}>
          <h5 className={styles.sectionTitle}>Relationships</h5>
          <ul className={styles.edgeList}>
            {connectedEdges.slice(0, 8).map((edge) => {
              const otherId = edge.sourceId === node.id ? edge.targetId : edge.sourceId
              const otherNode = connectedNodes.find((candidate) => candidate.id === otherId)

              return (
                <li key={edge.id} className={styles.edgeItem}>
                  <span className={styles.edgeType}>{formatEdgeType(edge.type)}</span>
                  <button
                    type="button"
                    className={styles.edgeTarget}
                    onClick={() => onSelectNode?.(otherId)}
                  >
                    {otherNode?.label ?? truncateLabel(otherId, 24)}
                  </button>
                  <span className={styles.edgeMeta}>
                    w{edge.weight} · {edge.confidence}%
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </aside>
  )
}
