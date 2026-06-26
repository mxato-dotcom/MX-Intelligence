import type { EntityType } from '@/intelligence/entities/EntityType'

export type BriefRiskLevel = 'Low' | 'Moderate' | 'Elevated' | 'High' | 'Critical'

export type BriefSectionId =
  | 'executive-summary'
  | 'key-events'
  | 'emerging-technologies'
  | 'cyber-security'
  | 'ai'
  | 'business'
  | 'crypto'
  | 'world-affairs'

export interface BriefSectionData {
  id: BriefSectionId
  title: string
  summary: string
  articleCount: number
  confidenceScore: number
  clusterIds: string[]
  articleIds: string[]
  entityLabels: string[]
}

export interface BriefSourceUsage {
  sourceName: string
  articleCount: number
}

export interface BriefHighlight {
  label: string
  value: string
  confidenceScore: number
}

export interface IntelligenceBriefPayload {
  sections: BriefSectionData[]
  topEvent: BriefHighlight | null
  topTechnology: BriefHighlight | null
  topOrganization: BriefHighlight | null
  topCountry: BriefHighlight | null
  sourcesUsed: BriefSourceUsage[]
  relatedClusterIds: string[]
  relatedArticleIds: string[]
  relatedEntities: Array<{ type: EntityType; label: string; count: number }>
  overallConfidence: number
}

export interface IntelligenceDailyBrief {
  id: string
  title: string
  summary: string
  executiveSummary: string
  riskLevel: BriefRiskLevel
  importanceScore: number
  articleCount: number
  clusterCount: number
  entityCount: number
  generatedAt: string
  createdAt: string
  payload: IntelligenceBriefPayload
}

export interface BriefGenerationInput {
  articles: import('@/types/article').Article[]
  clusters: import('@/intelligence/fusion/FusionCluster').IntelligenceCluster[]
  entitySummaries: Array<{
    entityType: EntityType
    displayText: string
    mentionCount: number
    articleCount: number
  }>
}

export interface BriefGenerationResult {
  title: string
  summary: string
  executiveSummary: string
  riskLevel: BriefRiskLevel
  importanceScore: number
  articleCount: number
  clusterCount: number
  entityCount: number
  payload: IntelligenceBriefPayload
}

export interface BriefGeneratorProvider {
  generate(input: BriefGenerationInput): BriefGenerationResult
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
