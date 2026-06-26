import type { GraphData } from '@/types/graph'

export interface TruncatedGraphResult {
  graph: GraphData
  truncated: boolean
  totalNodes: number
  totalEdges: number
}

export function truncateGraph(
  graph: GraphData,
  options: {
    maxNodes?: number
    maxEdges?: number
    centerNodeId?: string
  } = {},
): TruncatedGraphResult {
  const maxNodes = options.maxNodes ?? 100
  const maxEdges = options.maxEdges ?? 200
  const centerNodeId = options.centerNodeId

  const totalNodes = graph.nodes.length
  const totalEdges = graph.edges.length

  if (totalNodes <= maxNodes && totalEdges <= maxEdges) {
    return { graph, truncated: false, totalNodes, totalEdges }
  }

  const connectionCount = new Map<string, number>()

  for (const edge of graph.edges) {
    connectionCount.set(edge.sourceId, (connectionCount.get(edge.sourceId) ?? 0) + 1)
    connectionCount.set(edge.targetId, (connectionCount.get(edge.targetId) ?? 0) + 1)
  }

  const rankedNodes = [...graph.nodes].sort((left, right) => {
    if (centerNodeId && left.id === centerNodeId) {
      return -1
    }
    if (centerNodeId && right.id === centerNodeId) {
      return 1
    }

    const leftScore = connectionCount.get(left.id) ?? 0
    const rightScore = connectionCount.get(right.id) ?? 0
    if (rightScore !== leftScore) {
      return rightScore - leftScore
    }

    return left.id.localeCompare(right.id)
  })

  const keptIds = new Set(rankedNodes.slice(0, maxNodes).map((node) => node.id))
  const nodes = graph.nodes.filter((node) => keptIds.has(node.id))

  let edges = graph.edges
    .filter((edge) => keptIds.has(edge.sourceId) && keptIds.has(edge.targetId))
    .sort((left, right) => right.weight - left.weight || right.confidence - left.confidence)

  if (edges.length > maxEdges) {
    edges = edges.slice(0, maxEdges)
  }

  return {
    graph: {
      nodes,
      edges,
      builtAt: graph.builtAt,
    },
    truncated: true,
    totalNodes,
    totalEdges,
  }
}
