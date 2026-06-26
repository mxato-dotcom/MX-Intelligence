import { graphEngine } from '@/intelligence/graph/GraphEngine'
import * as articleService from '@/services/articleService'
import { listDailyBriefHistory } from '@/services/dailyBriefService'
import { listAllArticleEntities, findByEntity } from '@/services/entityService'
import { rebuildFusionClusters, getFusionClusters } from '@/services/fusionClusterService'
import * as sourceService from '@/services/sourceService'
import { safeTrim } from '@/lib/safeString'
import type {
  ConnectedEntitySummary,
  EntityProfileData,
  GraphData,
  GraphStats,
  TopRelationship,
} from '@/types/graph'

let memoizedGraph: GraphData | null = null
let memoizedAt = 0

const MEMO_TTL_MS = 30_000

function isMemoFresh(): boolean {
  return memoizedGraph !== null && Date.now() - memoizedAt < MEMO_TTL_MS
}

export function clearGraphCache(): void {
  memoizedGraph = null
  memoizedAt = 0
}

export async function buildGraph(): Promise<GraphData> {
  await rebuildFusionClusters()

  const [articles, articleEntities, briefs, sources] = await Promise.all([
    articleService.getArticles(),
    listAllArticleEntities(),
    listDailyBriefHistory(50),
    sourceService.getSources(),
  ])

  const graph = graphEngine.build({
    articles,
    articleEntities,
    clusters: getFusionClusters(),
    briefs,
    sources,
  })

  memoizedGraph = graph
  memoizedAt = Date.now()

  return graph
}

export async function getGraph(forceRefresh = false): Promise<GraphData> {
  if (!forceRefresh && isMemoFresh()) {
    return memoizedGraph ?? { nodes: [], edges: [], builtAt: new Date().toISOString() }
  }

  try {
    return await buildGraph()
  } catch {
    return { nodes: [], edges: [], builtAt: new Date().toISOString() }
  }
}

export function getGraphStats(graph: GraphData): GraphStats {
  return graphEngine.computeStats(graph)
}

export async function getEntityGraph(normalizedText: string): Promise<GraphData> {
  const graph = await getGraph()
  const entityNode = graphEngine.findEntityNode(graph, normalizedText)

  if (!entityNode) {
    return { nodes: [], edges: [], builtAt: graph.builtAt }
  }

  return graphEngine.getSubgraph(graph, entityNode.id, 2)
}

export async function getArticleGraph(articleId: string): Promise<GraphData> {
  const graph = await getGraph()
  const centerId = `article:${articleId}`
  const exists = graph.nodes.some((node) => node.id === centerId)

  if (!exists) {
    return { nodes: [], edges: [], builtAt: graph.builtAt }
  }

  return graphEngine.getSubgraph(graph, centerId, 2)
}

export async function getClusterGraph(clusterId: string): Promise<GraphData> {
  const graph = await getGraph()
  const centerId = `cluster:${clusterId}`
  const exists = graph.nodes.some((node) => node.id === centerId)

  if (!exists) {
    return { nodes: [], edges: [], builtAt: graph.builtAt }
  }

  return graphEngine.getSubgraph(graph, centerId, 2)
}

export async function searchGraph(query: string): Promise<GraphData> {
  const graph = await getGraph()
  const needle = safeTrim(query).toLowerCase()

  if (!needle) {
    return graph
  }

  const matchedNodes = graphEngine.searchNodes(graph, needle)
  const matchedIds = new Set(matchedNodes.map((node) => node.id))

  const edges = graph.edges.filter(
    (edge) => matchedIds.has(edge.sourceId) || matchedIds.has(edge.targetId),
  )

  const connectedIds = new Set<string>(matchedIds)
  for (const edge of edges) {
    connectedIds.add(edge.sourceId)
    connectedIds.add(edge.targetId)
  }

  return {
    nodes: graph.nodes.filter((node) => connectedIds.has(node.id)),
    edges,
    builtAt: graph.builtAt,
  }
}

export async function getTopConnectedEntities(limit = 10): Promise<ConnectedEntitySummary[]> {
  const graph = await getGraph()
  return graphEngine.getTopConnectedEntities(graph, limit)
}

export async function getTopRelationships(limit = 5): Promise<TopRelationship[]> {
  const graph = await getGraph()
  return graphEngine.getTopRelationships(graph, limit)
}

export async function getEntityProfile(normalizedText: string): Promise<EntityProfileData | null> {
  const normalized = safeTrim(normalizedText).toLowerCase()
  if (!normalized) {
    return null
  }

  const records = await findByEntity(normalized)
  if (records.length === 0) {
    return null
  }

  const entityType = records[0].entity_type
  const displayText = records[0].entity_text
  let confidenceSum = 0
  const articleIds = new Set<string>()

  for (const record of records) {
    confidenceSum += record.confidence
    articleIds.add(record.article_id)
  }

  const articles = await articleService.getArticles()
  const articleMap = new Map(articles.map((article) => [article.id, article]))
  const relatedArticles = [...articleIds]
    .map((id) => articleMap.get(id))
    .filter((article): article is NonNullable<typeof article> => article !== undefined)
    .map((article) => ({
      id: article.id,
      title: article.title,
      source: article.source,
    }))

  const graph = await getEntityGraph(normalized)
  const relatedEntities = graphEngine
    .getTopConnectedEntities(graph, 20)
    .filter((entity) => entity.normalizedText !== normalized)

  const clusterNodes = graph.nodes
    .filter((node) => node.type === 'cluster')
    .map((node) => ({
      id: node.id.replace('cluster:', ''),
      title: node.label,
      confidenceScore: Number(node.metadata?.confidenceScore ?? 0),
    }))

  return {
    normalizedText: normalized,
    displayText,
    entityType,
    mentionCount: records.length,
    articleCount: articleIds.size,
    averageConfidence: Math.round(confidenceSum / records.length),
    relatedArticles,
    relatedEntities,
    relatedClusters: clusterNodes,
  }
}
