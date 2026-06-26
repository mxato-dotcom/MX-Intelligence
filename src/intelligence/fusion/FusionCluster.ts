import type { Article } from '@/types/article'

export type SourceAgreement = 'Confirmed' | 'Likely' | 'Conflicting' | 'Single Source'

export interface ClusterArticleRef {
  articleId: string
  title: string
  sourceName: string
  publishedAt: string
  trustScore: number
}

export interface IntelligenceCluster {
  id: string
  mainTitle: string
  summary: string
  reportCount: number
  contributingSources: string[]
  highestTrustSource: string
  highestTrustScore: number
  averageTrustScore: number
  latestUpdate: string
  keywords: string[]
  category: string
  confidenceScore: number
  agreement: SourceAgreement
  articleIds: string[]
  articles: ClusterArticleRef[]
}

export interface FusionDashboardStats {
  totalClusters: number
  intelligenceClusters: number
  confirmedEvents: number
  singleSourceEvents: number
  conflictingReports: number
  averageConfidence: number
  topClusterTitle: string | null
  topClusterConfidence: number
}

export interface SourceClusterSummary {
  sourceName: string
  clusterCount: number
  confirmedCount: number
}

export function createEmptyFusionStats(): FusionDashboardStats {
  return {
    totalClusters: 0,
    intelligenceClusters: 0,
    confirmedEvents: 0,
    singleSourceEvents: 0,
    conflictingReports: 0,
    averageConfidence: 0,
    topClusterTitle: null,
    topClusterConfidence: 0,
  }
}

export function articleToClusterRef(article: Article, trustScore: number): ClusterArticleRef {
  return {
    articleId: article.id,
    title: article.title,
    sourceName: article.source,
    publishedAt: article.published_at,
    trustScore,
  }
}
