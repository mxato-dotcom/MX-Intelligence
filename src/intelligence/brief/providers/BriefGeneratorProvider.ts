import type { EntityType } from '@/intelligence/entities/EntityType'
import type { IntelligenceCluster } from '@/intelligence/fusion/FusionCluster'
import type {
  BriefGenerationResult,
  BriefHighlight,
  BriefRiskLevel,
  BriefSectionData,
  BriefSectionId,
  BriefSourceUsage,
  IntelligenceBriefPayload,
} from '@/intelligence/brief/BriefTypes'
import type { Article } from '@/types/article'
import type { Source } from '@/types/source'

export interface GeneratedBriefSection {
  summary: string
  articleCount: number
  confidenceScore: number
  clusterIds: string[]
  articleIds: string[]
  entityLabels: string[]
}

export interface SourceTrustSnapshot {
  sourceId: string
  sourceName: string
  trustScore: number
  healthLabel: string
}

export interface BriefEntitySummary {
  entityType: EntityType
  displayText: string
  mentionCount: number
  articleCount: number
}

export interface BriefGenerationInput {
  articles: Article[]
  clusters: IntelligenceCluster[]
  entities: BriefEntitySummary[]
  sources: Source[]
  trustScores: SourceTrustSnapshot[]
}

export interface GeneratedBrief {
  title: string
  summary: string
  executive_summary: string
  risk_level: BriefRiskLevel
  importance_score: number
  key_events: GeneratedBriefSection
  emerging_technologies: GeneratedBriefSection
  cybersecurity: GeneratedBriefSection
  ai: GeneratedBriefSection
  business: GeneratedBriefSection
  crypto: GeneratedBriefSection
  world_affairs: GeneratedBriefSection
  confidence_score: number
  sources_used: BriefSourceUsage[]
  article_count: number
  cluster_count: number
  entity_count: number
  topEvent: BriefHighlight | null
  topTechnology: BriefHighlight | null
  topOrganization: BriefHighlight | null
  topCountry: BriefHighlight | null
  relatedClusterIds: string[]
  relatedArticleIds: string[]
  relatedEntities: Array<{ type: EntityType; label: string; count: number }>
  providerId?: string
}

export interface BriefGeneratorProvider {
  readonly id: string
  readonly name: string
  generateBrief(input: BriefGenerationInput): Promise<GeneratedBrief>
}

export const BRIEF_SECTION_ORDER: BriefSectionId[] = [
  'key-events',
  'emerging-technologies',
  'cyber-security',
  'ai',
  'business',
  'crypto',
  'world-affairs',
]

export function getOrderedBriefSections(sections: BriefSectionData[]): BriefSectionData[] {
  const order = new Map(BRIEF_SECTION_ORDER.map((id, index) => [id, index]))
  return [...sections].sort(
    (left, right) => (order.get(left.id) ?? 999) - (order.get(right.id) ?? 999),
  )
}

function toBriefSectionData(
  id: BriefSectionId,
  title: string,
  section: GeneratedBriefSection,
): BriefSectionData {
  return {
    id,
    title,
    summary: section.summary,
    articleCount: section.articleCount,
    confidenceScore: section.confidenceScore,
    clusterIds: section.clusterIds,
    articleIds: section.articleIds,
    entityLabels: section.entityLabels,
  }
}

export function generatedBriefToGenerationResult(generated: GeneratedBrief): BriefGenerationResult {
  const sections: BriefSectionData[] = [
    toBriefSectionData('key-events', 'Key Events', generated.key_events),
    toBriefSectionData('emerging-technologies', 'Emerging Technologies', generated.emerging_technologies),
    toBriefSectionData('cyber-security', 'Cyber Security', generated.cybersecurity),
    toBriefSectionData('ai', 'AI', generated.ai),
    toBriefSectionData('business', 'Business', generated.business),
    toBriefSectionData('crypto', 'Crypto', generated.crypto),
    toBriefSectionData('world-affairs', 'World Affairs', generated.world_affairs),
  ]

  const payload: IntelligenceBriefPayload = {
    sections,
    topEvent: generated.topEvent,
    topTechnology: generated.topTechnology,
    topOrganization: generated.topOrganization,
    topCountry: generated.topCountry,
    sourcesUsed: generated.sources_used,
    relatedClusterIds: generated.relatedClusterIds,
    relatedArticleIds: generated.relatedArticleIds,
    relatedEntities: generated.relatedEntities,
    overallConfidence: generated.confidence_score,
  }

  return {
    title: generated.title,
    summary: generated.summary,
    executiveSummary: generated.executive_summary,
    riskLevel: generated.risk_level,
    importanceScore: generated.importance_score,
    articleCount: generated.article_count,
    clusterCount: generated.cluster_count,
    entityCount: generated.entity_count,
    payload,
  }
}
