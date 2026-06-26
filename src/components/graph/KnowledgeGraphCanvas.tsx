import { useCallback, useMemo, useRef, useState, type MouseEvent, type WheelEvent } from 'react'
import { computeDeterministicLayout } from '@/intelligence/graph/graphLayout'
import {
  EDGE_TYPE_COLORS,
  NODE_TYPE_COLORS,
  getNodeMetric,
  truncateLabel,
} from '@/intelligence/graph/graphStyles'
import type { GraphData, GraphEdge, GraphEdgeType, GraphNodeType } from '@/types/graph'
import styles from './KnowledgeGraphCanvas.module.css'

export interface KnowledgeGraphCanvasProps {
  graph: GraphData
  centerNodeId?: string
  compact?: boolean
  selectedNodeId?: string | null
  onSelectNode?: (nodeId: string) => void
  activeNodeTypes: Set<GraphNodeType>
  activeEdgeTypes: Set<GraphEdgeType>
  zoom: number
  panX: number
  panY: number
  onPanChange: (panX: number, panY: number) => void
  onZoomChange: (zoom: number) => void
}

const CANVAS_WIDTH = 900
const CANVAS_HEIGHT = 520
const COMPACT_WIDTH = 640
const COMPACT_HEIGHT = 320

function isEdgeHighlighted(
  edge: GraphEdge,
  focusId: string | null,
): boolean {
  if (!focusId) {
    return false
  }

  return edge.sourceId === focusId || edge.targetId === focusId
}

export function KnowledgeGraphCanvas({
  graph,
  centerNodeId,
  compact = false,
  selectedNodeId = null,
  onSelectNode,
  activeNodeTypes,
  activeEdgeTypes,
  zoom,
  panX,
  panY,
  onPanChange,
  onZoomChange,
}: KnowledgeGraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  const width = compact ? COMPACT_WIDTH : CANVAS_WIDTH
  const height = compact ? COMPACT_HEIGHT : CANVAS_HEIGHT

  const filteredNodes = useMemo(
    () => graph.nodes.filter((node) => activeNodeTypes.has(node.type)),
    [graph.nodes, activeNodeTypes],
  )

  const visibleNodeIds = useMemo(
    () => new Set(filteredNodes.map((node) => node.id)),
    [filteredNodes],
  )

  const filteredEdges = useMemo(
    () =>
      graph.edges.filter(
        (edge) =>
          activeEdgeTypes.has(edge.type) &&
          visibleNodeIds.has(edge.sourceId) &&
          visibleNodeIds.has(edge.targetId),
      ),
    [graph.edges, activeEdgeTypes, visibleNodeIds],
  )

  const connectionCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const edge of filteredEdges) {
      counts.set(edge.sourceId, (counts.get(edge.sourceId) ?? 0) + 1)
      counts.set(edge.targetId, (counts.get(edge.targetId) ?? 0) + 1)
    }
    return counts
  }, [filteredEdges])

  const positions = useMemo(
    () =>
      computeDeterministicLayout(
        filteredNodes,
        filteredEdges,
        width,
        height,
        centerNodeId && visibleNodeIds.has(centerNodeId) ? centerNodeId : undefined,
      ),
    [filteredNodes, filteredEdges, width, height, centerNodeId, visibleNodeIds],
  )

  const focusId = hoveredNodeId ?? selectedNodeId

  const connectedToFocus = useMemo(() => {
    if (!focusId) {
      return null
    }

    const connected = new Set<string>([focusId])
    for (const edge of filteredEdges) {
      if (edge.sourceId === focusId) {
        connected.add(edge.targetId)
      }
      if (edge.targetId === focusId) {
        connected.add(edge.sourceId)
      }
    }

    return connected
  }, [focusId, filteredEdges])

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault()
      const delta = event.deltaY > 0 ? -0.1 : 0.1
      const nextZoom = Math.min(2.5, Math.max(0.4, zoom + delta))
      onZoomChange(nextZoom)
    },
    [onZoomChange, zoom],
  )

  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      if (event.button !== 0) {
        return
      }

      setIsPanning(true)
      panStart.current = {
        x: event.clientX,
        y: event.clientY,
        panX,
        panY,
      }
    },
    [panX, panY],
  )

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isPanning) {
        return
      }

      const deltaX = event.clientX - panStart.current.x
      const deltaY = event.clientY - panStart.current.y
      onPanChange(panStart.current.panX + deltaX, panStart.current.panY + deltaY)
    },
    [isPanning, onPanChange],
  )

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  if (filteredNodes.length === 0) {
    return (
      <div className={styles.empty}>
        No nodes match the current filters. Adjust node or edge filters to see the graph.
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`${styles.canvasWrap} ${compact ? styles.compact : ''}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg
        className={styles.canvas}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label="Knowledge graph visualization"
      >
        <g transform={`translate(${panX} ${panY}) scale(${zoom})`}>
          {filteredEdges.map((edge) => {
            const source = positions.get(edge.sourceId)
            const target = positions.get(edge.targetId)
            if (!source || !target) {
              return null
            }

            const highlighted = isEdgeHighlighted(edge, focusId)
            const dimmed = focusId !== null && !highlighted
            const strokeWidth = 1 + edge.weight / 25
            const opacity = dimmed ? 0.15 : 0.25 + edge.confidence / 140

            return (
              <line
                key={edge.id}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={EDGE_TYPE_COLORS[edge.type]}
                strokeWidth={highlighted ? strokeWidth + 1 : strokeWidth}
                strokeOpacity={highlighted ? Math.min(1, opacity + 0.35) : opacity}
                className={styles.edge}
              />
            )
          })}

          {filteredNodes.map((node) => {
            const position = positions.get(node.id)
            if (!position) {
              return null
            }

            const isSelected = selectedNodeId === node.id
            const isHovered = hoveredNodeId === node.id
            const isFocused = focusId === node.id
            const dimmed = connectedToFocus !== null && !connectedToFocus.has(node.id)

            const metric = getNodeMetric(node)
            const connections = connectionCounts.get(node.id) ?? 0
            const radius = compact ? 14 : 18 + Math.min(connections, 6)

            return (
              <g
                key={node.id}
                transform={`translate(${position.x} ${position.y})`}
                className={`${styles.nodeGroup} ${dimmed ? styles.dimmed : ''}`}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onClick={(event) => {
                  event.stopPropagation()
                  onSelectNode?.(node.id)
                }}
              >
                <circle
                  r={radius}
                  fill={NODE_TYPE_COLORS[node.type]}
                  stroke={isSelected || isHovered ? '#fff' : 'transparent'}
                  strokeWidth={isSelected || isHovered ? 2.5 : 0}
                  className={styles.nodeCircle}
                />
                <text y={radius + 14} className={styles.nodeLabel} textAnchor="middle">
                  {truncateLabel(node.label, compact ? 12 : 16)}
                </text>
                <text y={radius + 28} className={styles.nodeBadge} textAnchor="middle">
                  {node.type}
                  {metric !== null ? ` · ${metric}%` : ''}
                  {connections > 0 ? ` · ${connections}` : ''}
                </text>
                {(isSelected || isFocused) && (
                  <circle r={radius + 6} className={styles.focusRing} fill="none" />
                )}
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
