import { graphEngine } from '@/intelligence/graph/GraphEngine'
import { deterministicSummaryProvider } from '@/intelligence/entityProfile/DeterministicSummaryProvider'
import type { IntelligenceCluster } from '@/intelligence/fusion/FusionCluster'
import type { EntityType } from '@/intelligence/entities/EntityType'
import { buildEntityId, parseEntityId } from '@/lib/entityId'
import { safeTrim } from '@/lib/safeString'
import * as articleService from '@/services/articleService'
import { findByEntity } from '@/services/entityService'
import { getGraph } from '@/services/graphService'
import { getClusterForArticle } from '@/services/fusionClusterService'
import * as sourceService from '@/services/sourceService'
import { getTimeline, filterTimeline } from '@/services/timelineService'
import { clusterAgreementToRisk } from '@/types/timeline'
import type {
  EntityCompareResult,
  EntityCompareSnapshot,
  EntityIntelligenceProfile,
  EntityProfileProvider,
  EntityRelatedArticle,
  EntityRelatedCluster,
  EntityRelatedEntity,
  EntitySummaryProvider,
  SimilarEntity,
} from '@/types/entityProfile'
import type { GraphData } from '@/types/graph'
import type { TimelineEvent } from '@/types/timeline'

const MEMO_TTL_MS = 30_000

interface ResolvedEntity {
  entityId: string
  entityType: EntityType
  normalizedText: string
}

interface ProfileCacheEntry {
  profile: EntityIntelligenceProfile
  cachedAt: number
}

const profileCache = new Map<string, ProfileCacheEntry>()

let summaryProvider: EntitySummaryProvider = deterministicSummaryProvider
let profileProvider: EntityProfileProvider | null = null

export function setEntitySummaryProvider(provider: EntitySummaryProvider): void {
  summaryProvider = provider
}

export function setEntityProfileProvider(provider: EntityProfileProvider): void {
  profileProvider = provider
}

export function clearEntityProfileCache(): void {
  profileCache.clear()
}

function isCacheFresh(entry: ProfileCacheEntry): boolean {
  return Date.now() - entry.cachedAt < MEMO_TTL_MS
}

export async function resolveEntityIdentifier(raw: string): Promise<ResolvedEntity | null> {
  const decoded = decodeURIComponent(safeTrim(raw))
  if (!decoded) {
    return null
  }

  const parsed = parseEntityId(decoded)
  if (parsed) {
    return {
      entityId: buildEntityId(parsed.entityType, parsed.normalizedText),
      entityType: parsed.entityType,
      normalizedText: parsed.normalizedText,
    }
  }

  const normalized = decoded.toLowerCase()
  const records = await findByEntity(normalized)
  if (records.length === 0) {
    return null
  }

  const entityType = records[0].entity_type
  const normalizedText = records[0].normalized_text.toLowerCase()

  return {
    entityId: buildEntityId(entityType, normalizedText),
    entityType,
    normalizedText,
  }
}

export async function resolveEntityFromSearch(query: string): Promise<ResolvedEntity | null> {
  const needle = safeTrim(query).toLowerCase()
  if (!needle) {
    return null
  }

  const direct = await resolveEntityIdentifier(needle)
  if (direct) {
    return direct
  }

  const records = await findByEntity(needle)
  if (records.length > 0) {
    const entityType = records[0].entity_type
    const normalizedText = records[0].normalized_text.toLowerCase()
    return {
      entityId: buildEntityId(entityType, normalizedText),
      entityType,
      normalizedText,
    }
  }

  const graph = await getGraph()
  const node = graph.nodes.find(
    (candidate) =>
      candidate.type === 'entity' &&
      (candidate.label.toLowerCase().includes(needle) ||
        String(candidate.metadata?.normalizedText ?? '').toLowerCase().includes(needle)),
  )

  if (!node) {
    return null
  }

  const entityType = String(node.metadata?.entityType ?? node.sublabel ?? 'Keyword') as EntityType
  const normalizedText = String(node.metadata?.normalizedText ?? node.label).toLowerCase()

  return {
    entityId: node.id.startsWith('entity:') ? node.id : buildEntityId(entityType, normalizedText),
    entityType,
    normalizedText,
  }
}

function findEntityNode(graph: GraphData, entityId: string, normalizedText: string): string | null {
  const byId = graph.nodes.find((node) => node.id === entityId)
  if (byId) {
    return byId.id
  }

  const byNormalized = graphEngine.findEntityNode(graph, normalizedText)
  return byNormalized?.id ?? null
}

function buildRelatedEntities(
  graph: GraphData,
  centerNodeId: string,
  normalizedText: string,
): EntityRelatedEntity[] {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]))
  const summaries = new Map<string, EntityRelatedEntity>()

  for (const edge of graph.edges) {
    if (edge.type !== 'co_occurs_with') {
      continue
    }

    let otherId: string | null = null
    if (edge.sourceId === centerNodeId) {
      otherId = edge.targetId
    } else if (edge.targetId === centerNodeId) {
      otherId = edge.sourceId
    }

    if (!otherId) {
      continue
    }

    const otherNode = nodeById.get(otherId)
    if (!otherNode || otherNode.type !== 'entity') {
      continue
    }

    const otherNormalized = String(otherNode.metadata?.normalizedText ?? otherNode.label).toLowerCase()
    if (otherNormalized === normalizedText) {
      continue
    }

    const entityType = String(otherNode.metadata?.entityType ?? otherNode.sublabel ?? 'Keyword') as EntityType
    const otherEntityId = otherNode.id.startsWith('entity:')
      ? otherNode.id
      : buildEntityId(entityType, otherNormalized)

    const existing = summaries.get(otherEntityId)
    if (!existing) {
      summaries.set(otherEntityId, {
        entityId: otherEntityId,
        displayText: otherNode.label,
        entityType,
        normalizedText: otherNormalized,
        relationshipStrength: edge.weight,
        coOccurrenceCount: edge.evidenceCount,
        averageConfidence: edge.confidence,
        mentionsTogether: edge.evidenceCount,
      })
      continue
    }

    existing.relationshipStrength = Math.max(existing.relationshipStrength, edge.weight)
    existing.coOccurrenceCount += edge.evidenceCount
    existing.mentionsTogether += edge.evidenceCount
    existing.averageConfidence = Math.round(
      (existing.averageConfidence + edge.confidence) / 2,
    )
  }

  return [...summaries.values()].sort(
    (left, right) =>
      right.coOccurrenceCount - left.coOccurrenceCount ||
      right.averageConfidence - left.averageConfidence ||
      right.relationshipStrength - left.relationshipStrength,
  )
}

function buildSimilarEntities(
  graph: GraphData,
  centerNodeId: string,
  normalizedText: string,
  limit = 6,
): SimilarEntity[] {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]))
  const scores = new Map<string, SimilarEntity>()

  for (const edge of graph.edges) {
    const connectedId =
      edge.sourceId === centerNodeId
        ? edge.targetId
        : edge.targetId === centerNodeId
          ? edge.sourceId
          : null

    if (!connectedId) {
      continue
    }

    const node = nodeById.get(connectedId)
    if (!node || node.type !== 'entity') {
      continue
    }

    const otherNormalized = String(node.metadata?.normalizedText ?? node.label).toLowerCase()
    if (otherNormalized === normalizedText) {
      continue
    }

    const entityType = String(node.metadata?.entityType ?? node.sublabel ?? 'Keyword') as EntityType
    const entityId = node.id.startsWith('entity:') ? node.id : buildEntityId(entityType, otherNormalized)
    const existing = scores.get(entityId)

    if (!existing) {
      scores.set(entityId, {
        entityId,
        displayText: node.label,
        entityType,
        normalizedText: otherNormalized,
        graphWeight: edge.weight,
        connectionCount: 1,
      })
      continue
    }

    existing.graphWeight += edge.weight
    existing.connectionCount += 1
  }

  return [...scores.values()]
    .sort((left, right) => right.graphWeight - left.graphWeight || right.connectionCount - left.connectionCount)
    .slice(0, limit)
}

async function buildEntityIntelligenceProfile(
  resolved: ResolvedEntity,
): Promise<EntityIntelligenceProfile | null> {
  const records = await findByEntity(resolved.normalizedText, resolved.entityType)
  if (records.length === 0) {
    return null
  }

  const graph = await getGraph()
  const centerNodeId = findEntityNode(graph, resolved.entityId, resolved.normalizedText)
  if (!centerNodeId) {
    return null
  }

  const subgraph = graphEngine.getSubgraph(graph, centerNodeId, 2)
  const articles = await articleService.getArticles()
  const sources = await sourceService.getSources()
  const sourceTrust = new Map(sources.map((source) => [source.name.toLowerCase(), source.trust_score ?? 50]))

  const articleMap = new Map(articles.map((article) => [article.id, article]))
  const articleIds = new Set<string>()
  let confidenceSum = 0
  let firstSeen = records[0].created_at
  let lastSeen = records[0].created_at
  const sourceNames = new Set<string>()
  const articleConfidence = new Map<string, number>()

  for (const record of records) {
    confidenceSum += record.confidence
    articleIds.add(record.article_id)
    articleConfidence.set(record.article_id, record.confidence)

    if (record.created_at < firstSeen) {
      firstSeen = record.created_at
    }
    if (record.created_at > lastSeen) {
      lastSeen = record.created_at
    }

    const article = articleMap.get(record.article_id)
    if (article?.source) {
      sourceNames.add(article.source)
    }
  }

  const clusterMap = new Map<string, IntelligenceCluster>()
  const relatedClusters: EntityRelatedCluster[] = []

  for (const articleId of articleIds) {
    const cluster = getClusterForArticle(articleId)
    if (!cluster || clusterMap.has(cluster.id)) {
      continue
    }

    clusterMap.set(cluster.id, cluster)
    relatedClusters.push({
      id: cluster.id,
      title: cluster.mainTitle,
      confidenceScore: cluster.confidenceScore,
      reportCount: cluster.reportCount,
      sources: cluster.contributingSources,
    })
  }

  const relatedArticles: EntityRelatedArticle[] = []

  for (const articleId of articleIds) {
    const article = articleMap.get(articleId)
    if (!article) {
      continue
    }

    const cluster = getClusterForArticle(articleId)
    const trust = sourceTrust.get(safeTrim(article.source).toLowerCase()) ?? 50

    relatedArticles.push({
      id: article.id,
      title: article.title,
      source: article.source,
      publishedAt: article.published_at || article.created_at,
      trust,
      clusterId: cluster?.id ?? null,
      clusterTitle: cluster?.mainTitle ?? null,
      risk: cluster ? clusterAgreementToRisk(cluster) : 'Low',
      confidence: articleConfidence.get(articleId) ?? 0,
    })
  }

  relatedArticles.sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))

  let trustSum = 0
  for (const article of relatedArticles) {
    trustSum += article.trust
  }

  const timeline = await getTimeline()
  const timelineEvents = filterTimeline(timeline, { entity: resolved.normalizedText })
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))

  const relatedEntities = buildRelatedEntities(subgraph, centerNodeId, resolved.normalizedText)
  const similarEntities = buildSimilarEntities(subgraph, centerNodeId, resolved.normalizedText)

  const connectionCount = subgraph.edges.filter(
    (edge) => edge.sourceId === centerNodeId || edge.targetId === centerNodeId,
  ).length

  const profileBase: EntityIntelligenceProfile = {
    entityId: resolved.entityId,
    displayText: records[0].entity_text,
    entityType: resolved.entityType,
    normalizedText: resolved.normalizedText,
    confidence: Math.round(confidenceSum / records.length),
    totalMentions: records.length,
    totalArticles: articleIds.size,
    totalClusters: relatedClusters.length,
    firstSeen,
    lastSeen,
    relatedSources: [...sourceNames].sort(),
    summary: '',
    stats: {
      articles: articleIds.size,
      mentions: records.length,
      clusters: relatedClusters.length,
      connections: connectionCount,
      averageTrust:
        relatedArticles.length === 0 ? 0 : Math.round(trustSum / relatedArticles.length),
      averageConfidence: Math.round(confidenceSum / records.length),
    },
    timelineEvents,
    relatedArticles,
    relatedEntities,
    relatedClusters,
    similarEntities,
    graphData: subgraph,
    graphCenterNodeId: centerNodeId,
  }

  profileBase.summary = summaryProvider.generateSummary(profileBase)

  return profileBase
}

export async function getEntityIntelligenceProfile(
  rawEntityId: string,
  forceRefresh = false,
): Promise<EntityIntelligenceProfile | null> {
  const resolved = await resolveEntityIdentifier(rawEntityId)
  if (!resolved) {
    return null
  }

  const cached = profileCache.get(resolved.entityId)
  if (!forceRefresh && cached && isCacheFresh(cached)) {
    return cached.profile
  }

  if (profileProvider) {
    const profile = await profileProvider.buildProfile(resolved.entityId)
    if (profile) {
      profileCache.set(resolved.entityId, { profile, cachedAt: Date.now() })
      return profile
    }
  }

  const profile = await buildEntityIntelligenceProfile(resolved)
  if (!profile) {
    return null
  }

  profileCache.set(resolved.entityId, { profile, cachedAt: Date.now() })
  return profile
}

export async function getEntityTimelineEvents(rawEntityId: string): Promise<TimelineEvent[]> {
  const profile = await getEntityIntelligenceProfile(rawEntityId)
  return profile?.timelineEvents ?? []
}

function snapshotFromProfile(profile: EntityIntelligenceProfile): EntityCompareSnapshot {
  return {
    entityId: profile.entityId,
    displayText: profile.displayText,
    entityType: profile.entityType,
    mentions: profile.totalMentions,
    articles: profile.totalArticles,
    clusters: profile.totalClusters,
    averageTrust: profile.stats.averageTrust,
    averageConfidence: profile.stats.averageConfidence,
    sources: profile.relatedSources,
  }
}

export async function compareEntities(
  rawEntityIdA: string,
  rawEntityIdB: string,
): Promise<EntityCompareResult | null> {
  const [profileA, profileB] = await Promise.all([
    getEntityIntelligenceProfile(rawEntityIdA),
    getEntityIntelligenceProfile(rawEntityIdB),
  ])

  if (!profileA || !profileB) {
    return null
  }

  const articleIdsA = new Set(profileA.relatedArticles.map((article) => article.id))
  const clusterIdsA = new Set(profileA.relatedClusters.map((cluster) => cluster.id))
  const entityIdsA = new Map(
    profileA.relatedEntities.map((entity) => [entity.entityId, entity.relationshipStrength]),
  )

  const sharedArticles = profileB.relatedArticles.filter((article) => articleIdsA.has(article.id))
  const sharedClusters = profileB.relatedClusters.filter((cluster) => clusterIdsA.has(cluster.id))

  const sharedRelationships = profileB.relatedEntities
    .filter((entity) => entityIdsA.has(entity.entityId))
    .map((entity) => ({
      entityLabel: entity.displayText,
      entityType: entity.entityType,
      entityId: entity.entityId,
      weightA: entityIdsA.get(entity.entityId) ?? 0,
      weightB: entity.relationshipStrength,
    }))
    .sort((left, right) => right.weightA + right.weightB - (left.weightA + left.weightB))

  return {
    entityA: snapshotFromProfile(profileA),
    entityB: snapshotFromProfile(profileB),
    sharedArticles,
    sharedClusters,
    sharedRelationships,
  }
}

export async function getSimilarEntities(rawEntityId: string, limit = 6): Promise<SimilarEntity[]> {
  const profile = await getEntityIntelligenceProfile(rawEntityId)
  return profile?.similarEntities.slice(0, limit) ?? []
}

export async function getEntityGraphSection(rawEntityId: string): Promise<{
  graphData: GraphData
  centerNodeId: string
} | null> {
  const profile = await getEntityIntelligenceProfile(rawEntityId)
  if (!profile) {
    return null
  }

  return {
    graphData: profile.graphData,
    centerNodeId: profile.graphCenterNodeId,
  }
}

export async function listEntityOptions(limit = 200): Promise<
  Array<{ entityId: string; displayText: string; entityType: EntityType }>
> {
  const graph = await getGraph()
  return graph.nodes
    .filter((node) => node.type === 'entity')
    .slice(0, limit)
    .map((node) => ({
      entityId: node.id,
      displayText: node.label,
      entityType: String(node.metadata?.entityType ?? node.sublabel ?? 'Keyword') as EntityType,
    }))
}
