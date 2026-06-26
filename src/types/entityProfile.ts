import type { EntityType } from '@/intelligence/entities/EntityType'
import type { BriefRiskLevel } from '@/intelligence/brief/BriefTypes'
import type { GraphData } from '@/types/graph'
import type { TimelineEvent } from '@/types/timeline'

export interface EntityProfileStats {
  articles: number
  mentions: number
  clusters: number
  connections: number
  averageTrust: number
  averageConfidence: number
}

export interface EntityRelatedArticle {
  id: string
  title: string
  source: string
  publishedAt: string
  trust: number
  clusterId: string | null
  clusterTitle: string | null
  risk: BriefRiskLevel | 'Info' | 'Low' | 'Medium' | 'High' | 'Critical'
  confidence: number
}

export interface EntityRelatedEntity {
  entityId: string
  displayText: string
  entityType: EntityType
  normalizedText: string
  relationshipStrength: number
  coOccurrenceCount: number
  averageConfidence: number
  mentionsTogether: number
}

export interface EntityRelatedCluster {
  id: string
  title: string
  confidenceScore: number
  reportCount: number
  sources: string[]
}

export interface SimilarEntity {
  entityId: string
  displayText: string
  entityType: EntityType
  normalizedText: string
  graphWeight: number
  connectionCount: number
}

export interface EntityIntelligenceProfile {
  entityId: string
  displayText: string
  entityType: EntityType
  normalizedText: string
  confidence: number
  totalMentions: number
  totalArticles: number
  totalClusters: number
  firstSeen: string
  lastSeen: string
  relatedSources: string[]
  summary: string
  stats: EntityProfileStats
  timelineEvents: TimelineEvent[]
  relatedArticles: EntityRelatedArticle[]
  relatedEntities: EntityRelatedEntity[]
  relatedClusters: EntityRelatedCluster[]
  similarEntities: SimilarEntity[]
  graphData: GraphData
  graphCenterNodeId: string
}

export interface EntityCompareSnapshot {
  entityId: string
  displayText: string
  entityType: EntityType
  mentions: number
  articles: number
  clusters: number
  averageTrust: number
  averageConfidence: number
  sources: string[]
}

export interface EntityCompareResult {
  entityA: EntityCompareSnapshot
  entityB: EntityCompareSnapshot
  sharedArticles: EntityRelatedArticle[]
  sharedClusters: EntityRelatedCluster[]
  sharedRelationships: Array<{
    entityLabel: string
    entityType: EntityType
    entityId: string
    weightA: number
    weightB: number
  }>
}

export interface EntitySummaryProvider {
  generateSummary(profile: EntityIntelligenceProfile): string
}

export interface EntityProfileProvider {
  buildProfile(entityId: string): Promise<EntityIntelligenceProfile | null>
}
