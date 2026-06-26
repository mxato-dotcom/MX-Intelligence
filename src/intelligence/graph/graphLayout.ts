import type { GraphEdge, GraphNode, GraphNodeType } from '@/types/graph'

export interface GraphLayoutPosition {
  x: number
  y: number
}

const TYPE_RING_RADIUS: Record<GraphNodeType, number> = {
  entity: 90,
  article: 150,
  cluster: 210,
  brief: 250,
  source: 280,
}

function hashOffset(id: string): number {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) | 0
  }

  return ((hash % 1000) / 1000) * 0.35
}

function clonePositions(positions: Map<string, GraphLayoutPosition>): Map<string, GraphLayoutPosition> {
  const clone = new Map<string, GraphLayoutPosition>()
  for (const [id, position] of positions) {
    clone.set(id, { x: position.x, y: position.y })
  }
  return clone
}

export function computeDeterministicLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  centerNodeId?: string,
): Map<string, GraphLayoutPosition> {
  const centerX = width / 2
  const centerY = height / 2
  const positions = new Map<string, GraphLayoutPosition>()

  if (nodes.length === 0) {
    return positions
  }

  const sortedNodes = [...nodes].sort((left, right) => left.id.localeCompare(right.id))
  const hasCenter = centerNodeId && sortedNodes.some((node) => node.id === centerNodeId)

  if (hasCenter) {
    positions.set(centerNodeId!, { x: centerX, y: centerY })
  }

  const types: GraphNodeType[] = ['entity', 'article', 'cluster', 'brief', 'source']

  for (const type of types) {
    const typeNodes = sortedNodes.filter(
      (node) => node.type === type && node.id !== centerNodeId,
    )

    const radius = TYPE_RING_RADIUS[type]
    const count = typeNodes.length

    typeNodes.forEach((node, index) => {
      const angle = (2 * Math.PI * index) / Math.max(count, 1) + hashOffset(node.id)
      positions.set(node.id, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      })
    })
  }

  for (const node of sortedNodes) {
    if (!positions.has(node.id)) {
      const angle = hashOffset(node.id) * Math.PI * 2
      positions.set(node.id, {
        x: centerX + 120 * Math.cos(angle),
        y: centerY + 120 * Math.sin(angle),
      })
    }
  }

  const working = clonePositions(positions)
  const nodeIds = sortedNodes.map((node) => node.id)

  for (let iteration = 0; iteration < 48; iteration += 1) {
    for (let leftIndex = 0; leftIndex < nodeIds.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < nodeIds.length; rightIndex += 1) {
        const leftId = nodeIds[leftIndex]
        const rightId = nodeIds[rightIndex]
        const left = working.get(leftId)!
        const right = working.get(rightId)!

        const deltaX = right.x - left.x
        const deltaY = right.y - left.y
        const distance = Math.max(Math.hypot(deltaX, deltaY), 1)
        const repulsion = 2200 / (distance * distance)
        const offsetX = (deltaX / distance) * repulsion
        const offsetY = (deltaY / distance) * repulsion

        if (leftId !== centerNodeId) {
          left.x -= offsetX
          left.y -= offsetY
        }
        if (rightId !== centerNodeId) {
          right.x += offsetX
          right.y += offsetY
        }
      }
    }

    for (const edge of edges) {
      const source = working.get(edge.sourceId)
      const target = working.get(edge.targetId)
      if (!source || !target) {
        continue
      }

      const deltaX = target.x - source.x
      const deltaY = target.y - source.y
      const distance = Math.max(Math.hypot(deltaX, deltaY), 1)
      const attraction = (distance - 80) * 0.04
      const offsetX = (deltaX / distance) * attraction
      const offsetY = (deltaY / distance) * attraction

      if (edge.sourceId !== centerNodeId) {
        source.x += offsetX
        source.y += offsetY
      }
      if (edge.targetId !== centerNodeId) {
        target.x -= offsetX
        target.y -= offsetY
      }
    }

    if (hasCenter) {
      const center = working.get(centerNodeId!)
      if (center) {
        center.x = centerX
        center.y = centerY
      }
    }
  }

  const padding = 60
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const position of working.values()) {
    minX = Math.min(minX, position.x)
    minY = Math.min(minY, position.y)
    maxX = Math.max(maxX, position.x)
    maxY = Math.max(maxY, position.y)
  }

  const graphWidth = Math.max(maxX - minX, 1)
  const graphHeight = Math.max(maxY - minY, 1)
  const scale = Math.min(
    (width - padding * 2) / graphWidth,
    (height - padding * 2) / graphHeight,
    1.2,
  )

  const fitted = new Map<string, GraphLayoutPosition>()
  for (const [id, position] of working) {
    fitted.set(id, {
      x: (position.x - minX) * scale + padding,
      y: (position.y - minY) * scale + padding,
    })
  }

  return fitted
}
