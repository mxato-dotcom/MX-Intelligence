import { fusionEngine } from '@/intelligence/fusion/FusionEngine'
import type {
  FusionDashboardStats,
  IntelligenceCluster,
  SourceClusterSummary,
} from '@/intelligence/fusion/FusionCluster'
import * as articleService from '@/services/articleService'
import * as sourceService from '@/services/sourceService'

export async function rebuildFusionClusters(): Promise<IntelligenceCluster[]> {
  const [articles, sources] = await Promise.all([
    articleService.getArticles(),
    sourceService.getSources(),
  ])

  return fusionEngine.buildClusters(articles, sources)
}

export function getFusionClusters(): IntelligenceCluster[] {
  return fusionEngine.getClusters()
}

export function getFusionDashboardStats(): FusionDashboardStats {
  return fusionEngine.getDashboardStats()
}

export function getClusterForArticle(articleId: string): IntelligenceCluster | null {
  return fusionEngine.getClusterForArticle(articleId)
}

export function getClustersForSource(sourceName: string): IntelligenceCluster[] {
  return fusionEngine.getClustersForSource(sourceName)
}

export function getSourceClusterSummary(sourceName: string): SourceClusterSummary {
  return fusionEngine.getSourceClusterSummary(sourceName)
}

export function subscribeFusionClusters(listener: () => void): () => void {
  return fusionEngine.subscribe(listener)
}
