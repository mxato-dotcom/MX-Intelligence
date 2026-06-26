export type GraphNodeType = 'entity' | 'article' | 'cluster' | 'brief' | 'source'

export type GraphEdgeType =
  | 'mentioned_in'
  | 'related_to'
  | 'same_cluster'
  | 'source_of'
  | 'included_in_brief'
  | 'co_occurs_with'

export interface GraphNode {
  id: string
  type: GraphNodeType
  label: string
  sublabel?: string
  metadata?: Record<string, unknown>
}

export interface GraphEdge {
  id: string
  sourceId: string
  targetId: string
  type: GraphEdgeType
  weight: number
  confidence: number
  evidenceCount: number
  lastSeenAt: string
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  builtAt: string
}

export interface GraphStats {
  totalNodes: number
  totalEdges: number
  topConnectedEntity: {
    label: string
    normalizedText: string
    entityType: string
    connectionCount: number
  } | null
  strongestRelationship: {
    sourceLabel: string
    targetLabel: string
    edgeType: GraphEdgeType
    weight: number
    confidence: number
    evidenceCount: number
  } | null
}

export interface TopRelationship {
  entityA: string
  entityB: string
  confidence: number
  evidenceCount: number
  weight: number
}

export interface ConnectedEntitySummary {
  entityLabel: string
  entityType: string
  normalizedText: string
  connectionCount: number
  strongestWeight: number
}

export interface EntityProfileData {
  normalizedText: string
  displayText: string
  entityType: string
  mentionCount: number
  articleCount: number
  averageConfidence: number
  relatedArticles: Array<{ id: string; title: string; source: string }>
  relatedEntities: ConnectedEntitySummary[]
  relatedClusters: Array<{ id: string; title: string; confidenceScore: number }>
}
