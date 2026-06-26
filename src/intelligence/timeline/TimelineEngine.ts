import type { IntelligenceDailyBrief } from '@/intelligence/brief/BriefTypes'
import type { IntelligenceCluster } from '@/intelligence/fusion/FusionCluster'
import type { IntelligenceAlert } from '@/types/alert'
import type { Article } from '@/types/article'
import type { AggregatedEntity } from '@/services/entityService'
import type {
  TimelineBuildInput,
  TimelineEvent,
  TimelineProvider,
} from '@/types/timeline'
import {
  alertSeverityToImportance,
  alertSeverityToRisk,
  clusterAgreementToRisk,
  parseTimestamp,
} from '@/types/timeline'
import { safeStringOr, safeTrim } from '@/lib/safeString'

function articleHaystack(article: Article): string {
  return [article.title, article.summary, article.content, article.category]
    .map((part) => safeTrim(part).toLowerCase())
    .join(' ')
}

function findMatchingEntities(article: Article, entities: AggregatedEntity[]): string[] {
  const haystack = articleHaystack(article)
  const matches: string[] = []

  for (const entity of entities) {
    const label = safeTrim(entity.displayText).toLowerCase()
    if (label.length >= 2 && haystack.includes(label)) {
      matches.push(entity.displayText)
    }
  }

  return [...new Set(matches)].slice(0, 12)
}

function clusterForArticle(articleId: string, clusters: IntelligenceCluster[]): IntelligenceCluster | null {
  return clusters.find((cluster) => cluster.articleIds.includes(articleId)) ?? null
}

function buildArticleEvents(
  articles: Article[],
  clusters: IntelligenceCluster[],
  entities: AggregatedEntity[],
): TimelineEvent[] {
  return articles.map((article) => {
    const cluster = clusterForArticle(article.id, clusters)
    const relatedEntities = findMatchingEntities(article, entities)

    return {
      id: `article:${article.id}`,
      timestamp: parseTimestamp(article.published_at, article.created_at),
      title: safeStringOr(article.title, 'Untitled article'),
      description: safeStringOr(article.summary, safeStringOr(article.content, 'Article intelligence signal')),
      type: 'article',
      importance: cluster ? Math.min(100, cluster.confidenceScore) : 45,
      confidence: cluster?.confidenceScore ?? 50,
      risk: cluster ? clusterAgreementToRisk(cluster) : 'Low',
      source: safeStringOr(article.source, 'Unknown source'),
      relatedArticles: [article.id],
      relatedEntities,
      relatedCluster: cluster?.id ?? null,
    }
  })
}

function buildClusterEvents(clusters: IntelligenceCluster[]): TimelineEvent[] {
  return clusters.map((cluster) => ({
    id: `cluster:${cluster.id}`,
    timestamp: parseTimestamp(cluster.latestUpdate),
    title: cluster.mainTitle,
    description: safeStringOr(cluster.summary, 'Fused intelligence cluster'),
    type: 'cluster',
    importance: cluster.confidenceScore,
    confidence: cluster.confidenceScore,
    risk: clusterAgreementToRisk(cluster),
    source: safeStringOr(cluster.highestTrustSource, 'Multiple sources'),
    relatedArticles: [...cluster.articleIds],
    relatedEntities: cluster.keywords.slice(0, 8),
    relatedCluster: cluster.id,
  }))
}

function buildBriefEvents(briefs: IntelligenceDailyBrief[]): TimelineEvent[] {
  return briefs.map((brief) => ({
    id: `brief:${brief.id}`,
    timestamp: parseTimestamp(brief.generatedAt, brief.createdAt),
    title: brief.title,
    description: brief.executiveSummary,
    type: 'brief',
    importance: brief.importanceScore,
    confidence: brief.payload.overallConfidence,
    risk: brief.riskLevel,
    source: 'Intelligence Brief',
    relatedArticles: brief.payload.relatedArticleIds.slice(0, 20),
    relatedEntities: brief.payload.relatedEntities.slice(0, 10).map((entity) => entity.label),
    relatedCluster: brief.payload.relatedClusterIds[0] ?? null,
    relatedBriefId: brief.id,
  }))
}

function buildAlertEvents(alerts: IntelligenceAlert[]): TimelineEvent[] {
  return alerts.map((alert) => ({
    id: `alert:${alert.id}`,
    timestamp: parseTimestamp(alert.createdAt),
    title: alert.title,
    description: alert.message,
    type: 'alert',
    importance: alertSeverityToImportance(alert.severity),
    confidence: alertSeverityToImportance(alert.severity),
    risk: alertSeverityToRisk(alert.severity),
    source: safeStringOr(alert.category, 'Alert'),
    relatedArticles: alert.relatedArticleId ? [alert.relatedArticleId] : [],
    relatedEntities: alert.relatedEntity ? [alert.relatedEntity] : [],
    relatedCluster: null,
    relatedBriefId: alert.relatedBriefId,
    relatedAlertId: alert.id,
  }))
}

function buildEntityEvents(
  articles: Article[],
  entities: AggregatedEntity[],
): TimelineEvent[] {
  const events: TimelineEvent[] = []

  for (const entity of entities.slice(0, 40)) {
    const label = entity.displayText
    const normalized = entity.normalizedText.toLowerCase()
    const relatedArticles = articles
      .filter((article) => articleHaystack(article).includes(normalized))
      .map((article) => article.id)

    if (relatedArticles.length === 0) {
      continue
    }

    const timestamps = articles
      .filter((article) => relatedArticles.includes(article.id))
      .map((article) => parseTimestamp(article.published_at, article.created_at))
      .sort((left, right) => right.localeCompare(left))

    events.push({
      id: `entity:${entity.entityType}:${normalized}`,
      timestamp: timestamps[0],
      title: `${entity.displayText} intelligence activity`,
      description: `${entity.displayText} (${entity.entityType}) mentioned in ${entity.articleCount} articles with ${entity.mentionCount} total mentions.`,
      type: 'entity',
      importance: Math.min(100, entity.articleCount * 12 + entity.mentionCount),
      confidence: entity.averageConfidence,
      risk: entity.articleCount >= 5 ? 'Moderate' : 'Low',
      source: entity.entityType,
      relatedArticles: relatedArticles.slice(0, 20),
      relatedEntities: [label],
      relatedCluster: null,
    })
  }

  return events
}

function mergeUnique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

export class DeterministicTimelineProvider implements TimelineProvider {
  buildEvents(input: TimelineBuildInput): TimelineEvent[] {
    const articleEvents = buildArticleEvents(input.articles, input.clusters, input.entities)
    const clusterEvents = buildClusterEvents(input.clusters)
    const briefEvents = buildBriefEvents(input.briefs)
    const alertEvents = buildAlertEvents(input.alerts)
    const entityEvents = buildEntityEvents(input.articles, input.entities)

    const events = [
      ...articleEvents,
      ...clusterEvents,
      ...briefEvents,
      ...alertEvents,
      ...entityEvents,
    ]

    return events.sort((left, right) => right.timestamp.localeCompare(left.timestamp))
  }

  correlateEvents(events: TimelineEvent[]): TimelineEvent[] {
    const byEntity = new Map<string, TimelineEvent[]>()
    const byCluster = new Map<string, TimelineEvent[]>()
    const byDate = new Map<string, TimelineEvent[]>()
    const bySource = new Map<string, TimelineEvent[]>()

    for (const event of events) {
      const dateKey = event.timestamp.slice(0, 10)
      const sourceKey = event.source.toLowerCase()

      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, [])
      }
      byDate.get(dateKey)!.push(event)

      if (!bySource.has(sourceKey)) {
        bySource.set(sourceKey, [])
      }
      bySource.get(sourceKey)!.push(event)

      if (event.relatedCluster) {
        if (!byCluster.has(event.relatedCluster)) {
          byCluster.set(event.relatedCluster, [])
        }
        byCluster.get(event.relatedCluster)!.push(event)
      }

      for (const entity of event.relatedEntities) {
        const key = entity.toLowerCase()
        if (!byEntity.has(key)) {
          byEntity.set(key, [])
        }
        byEntity.get(key)!.push(event)
      }
    }

    return events.map((event) => {
      const relatedArticles = new Set(event.relatedArticles)
      const relatedEntities = new Set(event.relatedEntities)
      let relatedCluster = event.relatedCluster

      const dateKey = event.timestamp.slice(0, 10)
      const sourceKey = event.source.toLowerCase()

      const correlated = new Set<TimelineEvent>([event])

      for (const other of byDate.get(dateKey) ?? []) {
        correlated.add(other)
      }
      for (const other of bySource.get(sourceKey) ?? []) {
        correlated.add(other)
      }
      if (event.relatedCluster) {
        for (const other of byCluster.get(event.relatedCluster) ?? []) {
          correlated.add(other)
        }
      }
      for (const entity of event.relatedEntities) {
        for (const other of byEntity.get(entity.toLowerCase()) ?? []) {
          correlated.add(other)
        }
      }

      for (const other of correlated) {
        other.relatedArticles.forEach((id) => relatedArticles.add(id))
        other.relatedEntities.forEach((label) => relatedEntities.add(label))
        if (other.relatedCluster && !relatedCluster) {
          relatedCluster = other.relatedCluster
        }
      }

      return {
        ...event,
        relatedArticles: mergeUnique([...relatedArticles]),
        relatedEntities: mergeUnique([...relatedEntities]),
        relatedCluster,
      }
    })
  }
}

export class TimelineEngine {
  constructor(private readonly provider: TimelineProvider = new DeterministicTimelineProvider()) {}

  getProvider(): TimelineProvider {
    return this.provider
  }

  build(input: TimelineBuildInput): TimelineEvent[] {
    const rawEvents = this.provider.buildEvents(input)
    return this.provider.correlateEvents(rawEvents)
  }
}

export const timelineEngine = new TimelineEngine()

export type { TimelineEvent, TimelineBuildInput, TimelineProvider }
