import type { GraphEdgeType, GraphNode, GraphNodeType } from '@/types/graph'

export const NODE_TYPE_COLORS: Record<GraphNodeType, string> = {
  entity: '#6366f1',
  article: '#0ea5e9',
  cluster: '#f59e0b',
  brief: '#10b981',
  source: '#8b5cf6',
}

export const EDGE_TYPE_COLORS: Record<GraphEdgeType, string> = {
  mentioned_in: '#6366f1',
  related_to: '#0ea5e9',
  same_cluster: '#f59e0b',
  source_of: '#8b5cf6',
  included_in_brief: '#10b981',
  co_occurs_with: '#ec4899',
}

export const ALL_NODE_TYPES: GraphNodeType[] = [
  'entity',
  'article',
  'cluster',
  'brief',
  'source',
]

export const ALL_EDGE_TYPES: GraphEdgeType[] = [
  'mentioned_in',
  'related_to',
  'same_cluster',
  'source_of',
  'included_in_brief',
  'co_occurs_with',
]

export function formatEdgeTypeLabel(type: GraphEdgeType): string {
  return type.replace(/_/g, ' ')
}

export function getNodeMetric(node: GraphNode): number | null {
  const metadata = node.metadata ?? {}
  if (node.type === 'entity') {
    const confidence = Number(metadata.confidence)
    return Number.isFinite(confidence) ? confidence : null
  }

  if (node.type === 'article' || node.type === 'source') {
    const trust = Number(metadata.trustScore)
    return Number.isFinite(trust) ? trust : null
  }

  if (node.type === 'cluster' || node.type === 'brief') {
    const score = Number(metadata.confidenceScore ?? metadata.importanceScore)
    return Number.isFinite(score) ? score : null
  }

  return null
}

export function truncateLabel(label: string, max = 18): string {
  const trimmed = label.trim()
  if (trimmed.length <= max) {
    return trimmed
  }

  return `${trimmed.slice(0, max - 1)}…`
}
