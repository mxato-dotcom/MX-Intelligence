import {
  articleToClusterRef,
  createEmptyFusionStats,
  type FusionDashboardStats,
  type IntelligenceCluster,
  type SourceClusterSummary,
} from '@/intelligence/fusion/FusionCluster'
import {
  calculateConfidenceScore,
  computeDuplicateConfidence,
  computeSemanticSimilarity,
  determineAgreement,
  type ArticleFusionProfile,
} from '@/intelligence/fusion/FusionScore'
import {
  buildTitleWordSet,
  extractArticleKeywords,
  extractClusterKeywords,
} from '@/intelligence/fusion/TopicExtractor'
import { buildNormalizedTitle } from '@/intelligence/duplicate/Fingerprint'
import { safeSlice, safeStringOr, safeTrim } from '@/lib/safeString'
import type { Article } from '@/types/article'
import type { Source } from '@/types/source'

const CLUSTER_SIMILARITY_THRESHOLD = 50

const clusterStore = new Map<string, IntelligenceCluster>()
const articleToClusterId = new Map<string, string>()
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) {
    listener()
  }
}

function simpleClusterId(articleIds: string[]): string {
  const sorted = [...articleIds].sort()
  let hash = 0

  for (const id of sorted) {
    for (let index = 0; index < id.length; index += 1) {
      hash = (hash << 5) - hash + id.charCodeAt(index)
      hash |= 0
    }
  }

  return `cluster-${Math.abs(hash).toString(36)}`
}

function parsePublishedMs(publishedAt: string | null | undefined): number {
  const parsed = new Date(publishedAt ?? '')
  return Number.isNaN(parsed.getTime()) ? Date.now() : parsed.getTime()
}

function buildTrustMap(sources: Source[]): Map<string, number> {
  const trustByName = new Map<string, number>()

  for (const source of sources) {
    trustByName.set(safeTrim(source.name).toLowerCase(), source.trust_score)
  }

  return trustByName
}

function getArticleTrust(article: Article, trustByName: Map<string, number>): number {
  return trustByName.get(safeTrim(article.source).toLowerCase()) ?? 50
}

function buildProfile(article: Article, trustByName: Map<string, number>): ArticleFusionProfile {
  const keywords = extractArticleKeywords(article)

  return {
    articleId: article.id,
    normalizedTitle: buildNormalizedTitle(article.title),
    titleWords: buildTitleWordSet(article.title),
    keywords: new Set(keywords),
    category: safeTrim(article.category).toLowerCase(),
    publishedAtMs: parsePublishedMs(article.published_at),
    sourceName: safeStringOr(article.source, 'Unknown source'),
    trustScore: getArticleTrust(article, trustByName),
  }
}

function unionFindCluster(profiles: ArticleFusionProfile[]): number[][] {
  const parent = profiles.map((_, index) => index)

  const find = (index: number): number => {
    if (parent[index] !== index) {
      parent[index] = find(parent[index])
    }
    return parent[index]
  }

  const union = (left: number, right: number) => {
    const leftRoot = find(left)
    const rightRoot = find(right)
    if (leftRoot !== rightRoot) {
      parent[rightRoot] = leftRoot
    }
  }

  for (let left = 0; left < profiles.length; left += 1) {
    for (let right = left + 1; right < profiles.length; right += 1) {
      const similarity = computeSemanticSimilarity(profiles[left], profiles[right])
      if (similarity >= CLUSTER_SIMILARITY_THRESHOLD) {
        union(left, right)
      }
    }
  }

  const groups = new Map<number, number[]>()

  for (let index = 0; index < profiles.length; index += 1) {
    const root = find(index)
    const group = groups.get(root) ?? []
    group.push(index)
    groups.set(root, group)
  }

  return [...groups.values()]
}

function buildClusterSummary(
  articles: Article[],
  profiles: ArticleFusionProfile[],
  trustByName: Map<string, number>,
): IntelligenceCluster {
  const sortedArticles = [...articles].sort(
    (left, right) => parsePublishedMs(right.published_at) - parsePublishedMs(left.published_at),
  )

  const mainArticle = sortedArticles[0]
  const articleIds = sortedArticles.map((article) => article.id)
  const clusterProfiles = profiles.filter((profile) => articleIds.includes(profile.articleId))

  const contributingSources = [...new Set(clusterProfiles.map((profile) => profile.sourceName))].sort()
  const trustScores = clusterProfiles.map((profile) => profile.trustScore)
  const averageTrustScore = Math.round(
    trustScores.reduce((sum, score) => sum + score, 0) / trustScores.length,
  )

  const highestTrustProfile = clusterProfiles.reduce((best, profile) =>
    profile.trustScore > best.trustScore ? profile : best,
  )

  const duplicateConfidence = computeDuplicateConfidence(clusterProfiles)
  const agreement = determineAgreement(clusterProfiles, duplicateConfidence)
  const latestUpdateMs = Math.max(...clusterProfiles.map((profile) => profile.publishedAtMs))

  const confidenceScore = calculateConfidenceScore({
    uniqueSourceCount: contributingSources.length,
    averageTrust: averageTrustScore,
    latestUpdateMs,
    agreement,
    duplicateConfidence,
  })

  const summarySource =
    safeTrim(mainArticle.summary) ||
    safeSlice(mainArticle.content, 0, 280) ||
    'Multiple intelligence reports cover this topic.'

  return {
    id: simpleClusterId(articleIds),
    mainTitle: safeStringOr(mainArticle.title, 'Untitled'),
    summary: summarySource,
    reportCount: sortedArticles.length,
    contributingSources,
    highestTrustSource: highestTrustProfile.sourceName,
    highestTrustScore: highestTrustProfile.trustScore,
    averageTrustScore,
    latestUpdate: mainArticle.published_at,
    keywords: extractClusterKeywords(sortedArticles),
    category: safeStringOr(mainArticle.category, 'Uncategorized'),
    confidenceScore,
    agreement,
    articleIds,
    articles: sortedArticles.map((article) =>
      articleToClusterRef(article, getArticleTrust(article, trustByName)),
    ),
  }
}

export class FusionEngine {
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  getClusters(): IntelligenceCluster[] {
    return [...clusterStore.values()].sort(
      (left, right) => parsePublishedMs(right.latestUpdate) - parsePublishedMs(left.latestUpdate),
    )
  }

  getClusterById(clusterId: string): IntelligenceCluster | null {
    return clusterStore.get(clusterId) ?? null
  }

  getClusterForArticle(articleId: string): IntelligenceCluster | null {
    const clusterId = articleToClusterId.get(articleId)
    if (!clusterId) {
      return null
    }

    return clusterStore.get(clusterId) ?? null
  }

  getClustersForSource(sourceName: string): IntelligenceCluster[] {
    const normalized = safeTrim(sourceName).toLowerCase()

    return this.getClusters().filter((cluster) =>
      cluster.contributingSources.some((name) => safeTrim(name).toLowerCase() === normalized),
    )
  }

  getSourceClusterSummary(sourceName: string): SourceClusterSummary {
    const clusters = this.getClustersForSource(sourceName)

    return {
      sourceName,
      clusterCount: clusters.length,
      confirmedCount: clusters.filter((cluster) => cluster.agreement === 'Confirmed').length,
    }
  }

  calculateConfidence(cluster: IntelligenceCluster): number {
    return cluster.confidenceScore
  }

  mergeArticles(articles: Article[], sources: Source[]): IntelligenceCluster[] {
    if (articles.length === 0) {
      clusterStore.clear()
      articleToClusterId.clear()
      notify()
      return []
    }

    const trustByName = buildTrustMap(sources)
    const profiles = articles.map((article) => buildProfile(article, trustByName))
    const groups = unionFindCluster(profiles)

    clusterStore.clear()
    articleToClusterId.clear()

    const clusters: IntelligenceCluster[] = []

    for (const groupIndices of groups) {
      const groupProfiles = groupIndices.map((index) => profiles[index])
      const groupArticles = groupIndices.map((index) => articles[index])
      const cluster = buildClusterSummary(groupArticles, groupProfiles, trustByName)
      clusters.push(cluster)
      clusterStore.set(cluster.id, cluster)

      for (const articleId of cluster.articleIds) {
        articleToClusterId.set(articleId, cluster.id)
      }
    }

    notify()
    return clusters
  }

  buildClusters(articles: Article[], sources: Source[]): IntelligenceCluster[] {
    return this.mergeArticles(articles, sources)
  }

  updateClusters(articles: Article[], sources: Source[]): IntelligenceCluster[] {
    return this.mergeArticles(articles, sources)
  }

  getDashboardStats(): FusionDashboardStats {
    const clusters = this.getClusters()

    if (clusters.length === 0) {
      return createEmptyFusionStats()
    }

    const confirmedEvents = clusters.filter((cluster) => cluster.agreement === 'Confirmed').length
    const singleSourceEvents = clusters.filter((cluster) => cluster.agreement === 'Single Source').length
    const conflictingReports = clusters.filter((cluster) => cluster.agreement === 'Conflicting').length
    const averageConfidence = Math.round(
      clusters.reduce((sum, cluster) => sum + cluster.confidenceScore, 0) / clusters.length,
    )

    const topCluster = [...clusters].sort(
      (left, right) => right.confidenceScore - left.confidenceScore || right.reportCount - left.reportCount,
    )[0]

    return {
      totalClusters: clusters.length,
      intelligenceClusters: clusters.length,
      confirmedEvents,
      singleSourceEvents,
      conflictingReports,
      averageConfidence,
      topClusterTitle: topCluster?.mainTitle ?? null,
      topClusterConfidence: topCluster?.confidenceScore ?? 0,
    }
  }
}

export const fusionEngine = new FusionEngine()
