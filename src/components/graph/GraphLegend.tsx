import {
  ALL_EDGE_TYPES,
  ALL_NODE_TYPES,
  EDGE_TYPE_COLORS,
  NODE_TYPE_COLORS,
  formatEdgeTypeLabel,
} from '@/intelligence/graph/graphStyles'
import type { GraphEdgeType, GraphNodeType } from '@/types/graph'
import styles from './GraphLegend.module.css'

interface GraphLegendProps {
  activeNodeTypes: Set<GraphNodeType>
  activeEdgeTypes: Set<GraphEdgeType>
}

export function GraphLegend({ activeNodeTypes, activeEdgeTypes }: GraphLegendProps) {
  return (
    <div className={styles.legend}>
      <div className={styles.group}>
        <p className={styles.groupTitle}>Node types</p>
        <ul className={styles.list}>
          {ALL_NODE_TYPES.map((type) => (
            <li key={type} className={styles.item}>
              <span
                className={styles.nodeDot}
                style={{
                  background: NODE_TYPE_COLORS[type],
                  opacity: activeNodeTypes.has(type) ? 1 : 0.35,
                }}
              />
              <span>{type}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.group}>
        <p className={styles.groupTitle}>Edge types</p>
        <ul className={styles.list}>
          {ALL_EDGE_TYPES.map((type) => (
            <li key={type} className={styles.item}>
              <span
                className={styles.edgeLine}
                style={{
                  background: EDGE_TYPE_COLORS[type],
                  opacity: activeEdgeTypes.has(type) ? 1 : 0.35,
                }}
              />
              <span>{formatEdgeTypeLabel(type)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
