import { timelineEngine } from '@/intelligence/timeline/TimelineEngine'
import * as articleService from '@/services/articleService'
import { listDailyBriefHistory } from '@/services/dailyBriefService'
import { getAlerts } from '@/services/alertService'
import { getAggregatedEntities } from '@/services/entityService'
import { rebuildFusionClusters, getFusionClusters } from '@/services/fusionClusterService'
import { safeTrim } from '@/lib/safeString'
import type { TimelineEvent, TimelineFilters } from '@/types/timeline'

let memoizedTimeline: TimelineEvent[] | null = null
let memoizedAt = 0

const MEMO_TTL_MS = 30_000

function isMemoFresh(): boolean {
  return memoizedTimeline !== null && Date.now() - memoizedAt < MEMO_TTL_MS
}

export function clearTimelineCache(): void {
  memoizedTimeline = null
  memoizedAt = 0
}

export async function buildTimeline(): Promise<TimelineEvent[]> {
  await rebuildFusionClusters()

  const [articles, clusters, briefs, alerts, entities] = await Promise.all([
    articleService.getArticles(),
    Promise.resolve(getFusionClusters()),
    listDailyBriefHistory(30),
    getAlerts(),
    getAggregatedEntities({ limit: 80 }),
  ])

  const events = timelineEngine.build({
    articles,
    clusters,
    briefs,
    alerts,
    entities,
  })

  memoizedTimeline = events
  memoizedAt = Date.now()

  return events
}

export async function getTimeline(forceRefresh = false): Promise<TimelineEvent[]> {
  if (!forceRefresh && isMemoFresh()) {
    return memoizedTimeline ?? []
  }

  return buildTimeline()
}

function eventMatchesEntityFilter(event: TimelineEvent, needle: string): boolean {
  const normalized = needle.toLowerCase()
  return event.relatedEntities.some((entity) => entity.toLowerCase().includes(normalized))
}

export function filterTimeline(events: TimelineEvent[], filters: TimelineFilters): TimelineEvent[] {
  let result = [...events]

  if (filters.types && filters.types.length > 0) {
    const allowed = new Set(filters.types)
    result = result.filter((event) => allowed.has(event.type))
  }

  if (filters.clusterId) {
    result = result.filter(
      (event) =>
        event.relatedCluster === filters.clusterId ||
        event.id === `cluster:${filters.clusterId}`,
    )
  }

  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom).toISOString()
    result = result.filter((event) => event.timestamp >= from)
  }

  if (filters.dateTo) {
    const to = new Date(filters.dateTo).toISOString()
    result = result.filter((event) => event.timestamp <= to)
  }

  if (filters.risks && filters.risks.length > 0) {
    const risks = new Set(filters.risks.map((risk) => risk.toLowerCase()))
    result = result.filter((event) => risks.has(event.risk.toLowerCase()))
  }

  if (filters.minConfidence !== undefined) {
    result = result.filter((event) => event.confidence >= filters.minConfidence!)
  }

  if (filters.entity) {
    result = result.filter((event) => eventMatchesEntityFilter(event, filters.entity!))
  }

  if (filters.source) {
    const source = filters.source.toLowerCase()
    result = result.filter((event) => event.source.toLowerCase().includes(source))
  }

  if (filters.technology) {
    result = result.filter((event) => eventMatchesEntityFilter(event, filters.technology!))
  }

  if (filters.organization) {
    result = result.filter((event) => eventMatchesEntityFilter(event, filters.organization!))
  }

  return result.sort((left, right) => right.timestamp.localeCompare(left.timestamp))
}

export function searchTimeline(events: TimelineEvent[], query: string): TimelineEvent[] {
  const normalized = safeTrim(query).toLowerCase()
  if (!normalized) {
    return events
  }

  return events
    .filter((event) => {
      const haystack = [
        event.title,
        event.description,
        event.source,
        event.type,
        event.risk,
        ...event.relatedEntities,
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalized)
    })
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
}

export function getRecentTimelineEvents(events: TimelineEvent[], limit = 5): TimelineEvent[] {
  return [...events]
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, limit)
}
