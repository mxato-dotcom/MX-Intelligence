import { getConnectorCatalogEntry } from '@/intelligence/connectors/connectorCatalog'
import { normalizeArticles } from '@/lib/normalizeArticle'
import { formatDate } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import type { Article } from '@/types/article'
import type { Source } from '@/types/source'

export interface ConnectorStatRow {
  connectorType: string
  sourceCount: number
  articleCount: number
}

export interface ConnectorActivityRow {
  sourceId: string
  sourceName: string
  connectorType: string
  lastSyncAt: string | null
  itemsCollected: number | null
  status: string
  trustScore: number
}

export interface ConnectorDashboardStats {
  articlesByConnector: ConnectorStatRow[]
  sourcesByConnector: ConnectorStatRow[]
  latestActivity: ConnectorActivityRow[]
}

function resolveConnectorType(sourceType: string): string {
  const entry = getConnectorCatalogEntry(sourceType)
  return entry?.type ?? sourceType
}

export async function getConnectorDashboardStats(
  sources: Source[],
): Promise<ConnectorDashboardStats> {
  const { data, error } = await supabase.from('articles').select('*')

  if (error) {
    throw error
  }

  const articles = normalizeArticles((data ?? []) as Record<string, unknown>[])
  const sourceNameToType = new Map(sources.map((source) => [source.name, resolveConnectorType(source.source_type)]))

  const articleCounts = new Map<string, number>()
  const sourceCounts = new Map<string, number>()

  for (const source of sources) {
    const type = resolveConnectorType(source.source_type)
    sourceCounts.set(type, (sourceCounts.get(type) ?? 0) + 1)
  }

  for (const article of articles) {
    const sourceName = article.source ?? ''
    const type = sourceNameToType.get(sourceName) ?? 'Unknown'
    articleCounts.set(type, (articleCounts.get(type) ?? 0) + 1)
  }

  const connectorTypes = new Set([...sourceCounts.keys(), ...articleCounts.keys()])

  const articlesByConnector: ConnectorStatRow[] = [...connectorTypes]
    .map((connectorType) => ({
      connectorType,
      sourceCount: sourceCounts.get(connectorType) ?? 0,
      articleCount: articleCounts.get(connectorType) ?? 0,
    }))
    .sort((a, b) => b.articleCount - a.articleCount)

  const sourcesByConnector = [...connectorTypes]
    .map((connectorType) => ({
      connectorType,
      sourceCount: sourceCounts.get(connectorType) ?? 0,
      articleCount: articleCounts.get(connectorType) ?? 0,
    }))
    .sort((a, b) => b.sourceCount - a.sourceCount)

  const latestActivity: ConnectorActivityRow[] = sources
    .map((source) => ({
      sourceId: source.id,
      sourceName: source.name,
      connectorType: resolveConnectorType(source.source_type),
      lastSyncAt: source.last_sync_at,
      itemsCollected: source.items_collected,
      status: source.status,
      trustScore: source.trust_score,
    }))
    .sort((a, b) => {
      const aTime = a.lastSyncAt ? new Date(a.lastSyncAt).getTime() : 0
      const bTime = b.lastSyncAt ? new Date(b.lastSyncAt).getTime() : 0
      return bTime - aTime
    })
    .slice(0, 8)

  return {
    articlesByConnector,
    sourcesByConnector,
    latestActivity,
  }
}

export function formatConnectorActivity(row: ConnectorActivityRow): string {
  if (!row.lastSyncAt) {
    return 'Never synced'
  }

  return formatDate(row.lastSyncAt)
}

export type { Article }
