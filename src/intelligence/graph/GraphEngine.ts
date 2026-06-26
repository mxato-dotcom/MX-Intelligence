import type { IntelligenceDailyBrief } from '@/intelligence/brief/BriefTypes'
import type { IntelligenceCluster } from '@/intelligence/fusion/FusionCluster'
import type { ArticleEntityRecord } from '@/intelligence/entities/Entity'
import type { EntityType } from '@/intelligence/entities/EntityType'
import { safeTrim } from '@/lib/safeString'
import type { Article } from '@/types/article'
import type { Source } from '@/types/source'
import type {
  ConnectedEntitySummary,
  GraphData,
  GraphEdge,
  GraphEdgeType,
  GraphNode,
  GraphStats,
  TopRelationship,
} from '@/types/graph'

export interface GraphBuildInput {
  articles: Article[]
  articleEntities: ArticleEntityRecord[]
  clusters: IntelligenceCluster[]
  briefs: IntelligenceDailyBrief[]
  sources: Source[]
}

interface EdgeAccumulatorEntry {
  sourceId: string
  targetId: string
  type: GraphEdgeType
  evidenceCount: number
  confidenceSum: number
  trustSum: number
  lastSeenAt: string
}

function entityNodeId(entityType: EntityType, normalizedText: string): string {
  return `entity:${entityType}:${normalizedText.toLowerCase()}`
}

function articleNodeId(articleId: string): string {
  return `article:${articleId}`
}

function clusterNodeId(clusterId: string): string {
  return `cluster:${clusterId}`
}

function briefNodeId(briefId: string): string {
  return `brief:${briefId}`
}

function sourceNodeId(sourceId: string): string {
  return `source:${sourceId}`
}

function canonicalPair(left: string, right: string): [string, string] {
  return left < right ? [left, right] : [right, left]
}

function recencyBonus(timestamp: string): number {
  if (!timestamp) {
    return 0
  }

  const ageMs = Date.now() - new Date(timestamp).getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)

  if (ageDays <= 1) {
    return 20
  }

  if (ageDays <= 7) {
    return 15
  }

  if (ageDays <= 30) {
    return 10
  }

  if (ageDays <= 90) {
    return 5
  }

  return 0
}

function computeWeight(evidenceCount: number, lastSeenAt: string): number {
  return Math.min(100, evidenceCount * 12 + recencyBonus(lastSeenAt))
}

function computeConfidence(confidenceSum: number, trustSum: number, evidenceCount: number): number {
  if (evidenceCount === 0) {
    return 0
  }

  const avgConfidence = confidenceSum / evidenceCount
  const avgTrust = trustSum / evidenceCount
  return Math.round(Math.min(100, avgConfidence * 0.6 + avgTrust * 0.4))
}

class EdgeAccumulator {
  private readonly edges = new Map<string, EdgeAccumulatorEntry>()

  add(
    sourceId: string,
    targetId: string,
    type: GraphEdgeType,
    confidence: number,
    trust: number,
    timestamp: string,
  ): void {
    const [orderedSource, orderedTarget] =
      type === 'co_occurs_with' ? canonicalPair(sourceId, targetId) : [sourceId, targetId]

    const key = `${orderedSource}|${orderedTarget}|${type}`
    const existing = this.edges.get(key)
    const safeTimestamp = timestamp || new Date(0).toISOString()

    if (!existing) {
      this.edges.set(key, {
        sourceId: orderedSource,
        targetId: orderedTarget,
        type,
        evidenceCount: 1,
        confidenceSum: confidence,
        trustSum: trust,
        lastSeenAt: safeTimestamp,
      })
      return
    }

    existing.evidenceCount += 1
    existing.confidenceSum += confidence
    existing.trustSum += trust
    if (safeTimestamp > existing.lastSeenAt) {
      existing.lastSeenAt = safeTimestamp
    }
  }

  toEdges(): GraphEdge[] {
    return [...this.edges.values()].map((entry) => ({
      id: `${entry.sourceId}|${entry.targetId}|${entry.type}`,
      sourceId: entry.sourceId,
      targetId: entry.targetId,
      type: entry.type,
      weight: computeWeight(entry.evidenceCount, entry.lastSeenAt),
      confidence: computeConfidence(entry.confidenceSum, entry.trustSum, entry.evidenceCount),
      evidenceCount: entry.evidenceCount,
      lastSeenAt: entry.lastSeenAt,
    }))
  }
}

export class GraphEngine {
  build(input: GraphBuildInput): GraphData {
    const nodes = new Map<string, GraphNode>()
    const edgeAccumulator = new EdgeAccumulator()

    const articleById = new Map<string, Article>()
    const sourceByName = new Map<string, Source>()
    const sourceTrustByName = new Map<string, number>()
    const clusterByArticleId = new Map<string, IntelligenceCluster>()

    for (const article of input.articles) {
      articleById.set(article.id, article)
    }

    for (const source of input.sources) {
      sourceByName.set(source.name.toLowerCase(), source)
      sourceTrustByName.set(source.name.toLowerCase(), source.trust_score ?? 50)
      nodes.set(sourceNodeId(source.id), {
        id: sourceNodeId(source.id),
        type: 'source',
        label: source.name,
        sublabel: source.source_type,
        metadata: {
          trustScore: source.trust_score,
          category: source.category,
        },
      })
    }

    for (const cluster of input.clusters) {
      nodes.set(clusterNodeId(cluster.id), {
        id: clusterNodeId(cluster.id),
        type: 'cluster',
        label: cluster.mainTitle,
        sublabel: cluster.agreement,
        metadata: {
          confidenceScore: cluster.confidenceScore,
          reportCount: cluster.reportCount,
        },
      })

      for (const articleId of cluster.articleIds) {
        clusterByArticleId.set(articleId, cluster)
      }
    }

    for (const article of input.articles) {
      nodes.set(articleNodeId(article.id), {
        id: articleNodeId(article.id),
        type: 'article',
        label: safeTrim(article.title) || 'Untitled',
        sublabel: safeTrim(article.source) || 'Unknown source',
        metadata: {
          category: article.category,
          publishedAt: article.published_at,
          url: article.url,
        },
      })

      const sourceName = safeTrim(article.source).toLowerCase()
      const source = sourceByName.get(sourceName)
      const trust = sourceTrustByName.get(sourceName) ?? 50
      const timestamp = article.published_at || article.created_at

      if (source) {
        edgeAccumulator.add(
          articleNodeId(article.id),
          sourceNodeId(source.id),
          'source_of',
          80,
          trust,
          timestamp,
        )
      }

      const cluster = clusterByArticleId.get(article.id)
      if (cluster) {
        edgeAccumulator.add(
          articleNodeId(article.id),
          clusterNodeId(cluster.id),
          'related_to',
          cluster.confidenceScore,
          trust,
          timestamp,
        )
      }
    }

    for (const brief of input.briefs) {
      nodes.set(briefNodeId(brief.id), {
        id: briefNodeId(brief.id),
        type: 'brief',
        label: brief.title,
        sublabel: brief.status,
        metadata: {
          riskLevel: brief.riskLevel,
          importanceScore: brief.importanceScore,
          generatedAt: brief.generatedAt,
        },
      })

      for (const articleId of brief.payload.relatedArticleIds) {
        const article = articleById.get(articleId)
        const trust = article
          ? sourceTrustByName.get(safeTrim(article.source).toLowerCase()) ?? 50
          : 50
        const timestamp = article?.published_at || article?.created_at || brief.generatedAt

        edgeAccumulator.add(
          briefNodeId(brief.id),
          articleNodeId(articleId),
          'included_in_brief',
          brief.payload.overallConfidence,
          trust,
          timestamp,
        )
      }

      for (const clusterId of brief.payload.relatedClusterIds) {
        edgeAccumulator.add(
          briefNodeId(brief.id),
          clusterNodeId(clusterId),
          'related_to',
          brief.payload.overallConfidence,
          60,
          brief.generatedAt,
        )
      }
    }

    const entitiesByArticle = new Map<string, ArticleEntityRecord[]>()

    for (const record of input.articleEntities) {
      const normalized = safeTrim(record.normalized_text).toLowerCase()
      if (!normalized) {
        continue
      }

      const nodeId = entityNodeId(record.entity_type, normalized)
      if (!nodes.has(nodeId)) {
        nodes.set(nodeId, {
          id: nodeId,
          type: 'entity',
          label: safeTrim(record.entity_text) || normalized,
          sublabel: record.entity_type,
          metadata: {
            normalizedText: normalized,
            entityType: record.entity_type,
          },
        })
      }

      const article = articleById.get(record.article_id)
      const trust = article
        ? sourceTrustByName.get(safeTrim(article.source).toLowerCase()) ?? 50
        : 50
      const timestamp = article?.published_at || article?.created_at || record.created_at

      edgeAccumulator.add(
        nodeId,
        articleNodeId(record.article_id),
        'mentioned_in',
        record.confidence,
        trust,
        timestamp,
      )

      const articleEntities = entitiesByArticle.get(record.article_id) ?? []
      articleEntities.push(record)
      entitiesByArticle.set(record.article_id, articleEntities)

      const cluster = clusterByArticleId.get(record.article_id)
      if (cluster) {
        edgeAccumulator.add(
          nodeId,
          clusterNodeId(cluster.id),
          'related_to',
          record.confidence,
          trust,
          timestamp,
        )
      }
    }

    for (const [articleId, articleEntities] of entitiesByArticle) {
      const article = articleById.get(articleId)
      const trust = article
        ? sourceTrustByName.get(safeTrim(article.source).toLowerCase()) ?? 50
        : 50
      const timestamp = article?.published_at || article?.created_at || new Date(0).toISOString()

      for (let leftIndex = 0; leftIndex < articleEntities.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < articleEntities.length; rightIndex += 1) {
          const left = articleEntities[leftIndex]
          const right = articleEntities[rightIndex]
          const leftId = entityNodeId(left.entity_type, left.normalized_text)
          const rightId = entityNodeId(right.entity_type, right.normalized_text)

          if (leftId === rightId) {
            continue
          }

          const avgConfidence = (left.confidence + right.confidence) / 2
          edgeAccumulator.add(leftId, rightId, 'co_occurs_with', avgConfidence, trust, timestamp)
        }
      }
    }

    for (const cluster of input.clusters) {
      if (cluster.articleIds.length < 2) {
        continue
      }

      for (let leftIndex = 0; leftIndex < cluster.articleIds.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < cluster.articleIds.length; rightIndex += 1) {
          const leftArticle = articleById.get(cluster.articleIds[leftIndex])
          const rightArticle = articleById.get(cluster.articleIds[rightIndex])
          const timestamp =
            leftArticle?.published_at ||
            rightArticle?.published_at ||
            cluster.latestUpdate

          edgeAccumulator.add(
            articleNodeId(cluster.articleIds[leftIndex]),
            articleNodeId(cluster.articleIds[rightIndex]),
            'same_cluster',
            cluster.confidenceScore,
            cluster.averageTrustScore,
            timestamp,
          )
        }
      }
    }

    return {
      nodes: [...nodes.values()],
      edges: edgeAccumulator.toEdges(),
      builtAt: new Date().toISOString(),
    }
  }

  computeStats(graph: GraphData): GraphStats {
    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]))
    const entityConnections = new Map<string, number>()

    for (const edge of graph.edges) {
      if (nodeById.get(edge.sourceId)?.type === 'entity') {
        entityConnections.set(edge.sourceId, (entityConnections.get(edge.sourceId) ?? 0) + 1)
      }
      if (nodeById.get(edge.targetId)?.type === 'entity') {
        entityConnections.set(edge.targetId, (entityConnections.get(edge.targetId) ?? 0) + 1)
      }
    }

    let topConnectedEntity: GraphStats['topConnectedEntity'] = null
    let topConnectionCount = 0

    for (const [nodeId, count] of entityConnections) {
      if (count <= topConnectionCount) {
        continue
      }

      const node = nodeById.get(nodeId)
      if (!node) {
        continue
      }

      topConnectionCount = count
      topConnectedEntity = {
        label: node.label,
        normalizedText: String(node.metadata?.normalizedText ?? node.label),
        entityType: String(node.metadata?.entityType ?? node.sublabel ?? 'Entity'),
        connectionCount: count,
      }
    }

    let strongestRelationship: GraphStats['strongestRelationship'] = null
    let strongestWeight = 0

    for (const edge of graph.edges) {
      if (edge.weight <= strongestWeight) {
        continue
      }

      const source = nodeById.get(edge.sourceId)
      const target = nodeById.get(edge.targetId)
      if (!source || !target) {
        continue
      }

      strongestWeight = edge.weight
      strongestRelationship = {
        sourceLabel: source.label,
        targetLabel: target.label,
        edgeType: edge.type,
        weight: edge.weight,
        confidence: edge.confidence,
        evidenceCount: edge.evidenceCount,
      }
    }

    return {
      totalNodes: graph.nodes.length,
      totalEdges: graph.edges.length,
      topConnectedEntity,
      strongestRelationship,
    }
  }

  getTopRelationships(graph: GraphData, limit = 5): TopRelationship[] {
    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]))

    return graph.edges
      .filter((edge) => edge.type === 'co_occurs_with')
      .sort((left, right) => right.weight - left.weight || right.evidenceCount - left.evidenceCount)
      .slice(0, limit)
      .map((edge) => {
        const source = nodeById.get(edge.sourceId)
        const target = nodeById.get(edge.targetId)
        return {
          entityA: source?.label ?? edge.sourceId,
          entityB: target?.label ?? edge.targetId,
          confidence: edge.confidence,
          evidenceCount: edge.evidenceCount,
          weight: edge.weight,
        }
      })
  }

  getTopConnectedEntities(graph: GraphData, limit = 10): ConnectedEntitySummary[] {
    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]))
    const summaries = new Map<string, ConnectedEntitySummary>()

    for (const edge of graph.edges) {
      for (const nodeId of [edge.sourceId, edge.targetId]) {
        const node = nodeById.get(nodeId)
        if (!node || node.type !== 'entity') {
          continue
        }

        const normalizedText = String(node.metadata?.normalizedText ?? node.label)
        const existing = summaries.get(nodeId)
        if (!existing) {
          summaries.set(nodeId, {
            entityLabel: node.label,
            entityType: String(node.metadata?.entityType ?? node.sublabel ?? 'Entity'),
            normalizedText,
            connectionCount: 1,
            strongestWeight: edge.weight,
          })
          continue
        }

        existing.connectionCount += 1
        existing.strongestWeight = Math.max(existing.strongestWeight, edge.weight)
      }
    }

    return [...summaries.values()]
      .sort((left, right) => right.connectionCount - left.connectionCount)
      .slice(0, limit)
  }

  getSubgraph(graph: GraphData, centerNodeId: string, depth = 1): GraphData {
    const connectedIds = new Set<string>([centerNodeId])
    let frontier = new Set<string>([centerNodeId])

    for (let level = 0; level < depth; level += 1) {
      const nextFrontier = new Set<string>()
      for (const edge of graph.edges) {
        if (frontier.has(edge.sourceId)) {
          nextFrontier.add(edge.targetId)
          connectedIds.add(edge.targetId)
        }
        if (frontier.has(edge.targetId)) {
          nextFrontier.add(edge.sourceId)
          connectedIds.add(edge.sourceId)
        }
      }
      frontier = nextFrontier
    }

    return {
      nodes: graph.nodes.filter((node) => connectedIds.has(node.id)),
      edges: graph.edges.filter(
        (edge) => connectedIds.has(edge.sourceId) && connectedIds.has(edge.targetId),
      ),
      builtAt: graph.builtAt,
    }
  }

  searchNodes(graph: GraphData, query: string): GraphNode[] {
    const needle = safeTrim(query).toLowerCase()
    if (!needle) {
      return graph.nodes
    }

    return graph.nodes.filter((node) => {
      return (
        node.label.toLowerCase().includes(needle) ||
        (node.sublabel?.toLowerCase().includes(needle) ?? false) ||
        node.id.toLowerCase().includes(needle)
      )
    })
  }

  findEntityNode(graph: GraphData, normalizedText: string): GraphNode | null {
    const needle = safeTrim(normalizedText).toLowerCase()
    return (
      graph.nodes.find(
        (node) =>
          node.type === 'entity' &&
          String(node.metadata?.normalizedText ?? '').toLowerCase() === needle,
      ) ?? null
    )
  }
}

export const graphEngine = new GraphEngine()
