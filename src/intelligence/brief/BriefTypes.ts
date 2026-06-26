import type { EntityType } from '@/intelligence/entities/EntityType'

export type BriefRiskLevel = 'Low' | 'Moderate' | 'Elevated' | 'High' | 'Critical'

export type BriefStatus = 'draft' | 'reviewed' | 'published' | 'archived'

export const BRIEF_STATUSES: BriefStatus[] = ['draft', 'reviewed', 'published', 'archived']

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
  status: BriefStatus
  reviewedAt: string | null
  publishedAt: string | null
  archivedAt: string | null
  payload: IntelligenceBriefPayload
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

export const BRIEF_SECTION_ORDER: BriefSectionId[] = [
  'key-events',
  'emerging-technologies',
  'cyber-security',
  'ai',
  'business',
  'crypto',
  'world-affairs',
]
