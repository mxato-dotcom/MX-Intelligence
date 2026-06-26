import {
  ALL_EDGE_TYPES,
  ALL_NODE_TYPES,
  formatEdgeTypeLabel,
} from '@/intelligence/graph/graphStyles'
import type { GraphEdgeType, GraphNodeType } from '@/types/graph'
import styles from './GraphControls.module.css'

interface GraphControlsProps {
  activeNodeTypes: Set<GraphNodeType>
  activeEdgeTypes: Set<GraphEdgeType>
  onToggleNodeType: (type: GraphNodeType) => void
  onToggleEdgeType: (type: GraphEdgeType) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView: () => void
  compact?: boolean
}

export function GraphControls({
  activeNodeTypes,
  activeEdgeTypes,
  onToggleNodeType,
  onToggleEdgeType,
  onZoomIn,
  onZoomOut,
  onResetView,
  compact = false,
}: GraphControlsProps) {
  return (
    <div className={`${styles.controls} ${compact ? styles.compact : ''}`}>
      <div className={styles.buttonGroup}>
        <button type="button" className={styles.button} onClick={onZoomIn} aria-label="Zoom in">
          +
        </button>
        <button type="button" className={styles.button} onClick={onZoomOut} aria-label="Zoom out">
          −
        </button>
        <button type="button" className={styles.button} onClick={onResetView}>
          Reset
        </button>
      </div>

      {!compact && (
        <>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Nodes</span>
            <div className={styles.chips}>
              {ALL_NODE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`${styles.chip} ${activeNodeTypes.has(type) ? styles.chipActive : ''}`}
                  onClick={() => onToggleNodeType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Edges</span>
            <div className={styles.chips}>
              {ALL_EDGE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`${styles.chip} ${activeEdgeTypes.has(type) ? styles.chipActive : ''}`}
                  onClick={() => onToggleEdgeType(type)}
                >
                  {formatEdgeTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
