import { supabase } from '@/lib/supabase'
import { isMissingTableError } from '@/lib/supabaseErrors'
import { getConnectorCatalogEntry } from '@/intelligence/connectors/connectorCatalog'
import { normalizeArticles } from '@/lib/normalizeArticle'
import {
  evaluateConnectorReadiness,
  getCredentialStatuses,
} from '@/services/connectorCredentialService'
import type { Source } from '@/types/source'
import type {
  ConnectorHealthRecord,
  ConnectorId,
  ConnectionTestStatus,
} from '@/types/connectorSettings'
import { CONNECTOR_PROVIDERS } from '@/types/connectorSettings'
import * as sourceService from '@/services/sourceService'

interface SyncHistoryRow {
  connector_id: string
  source_id: string | null
  started_at: string
  finished_at: string | null
  duration_ms: number | null
  status: string
  articles_imported: number
  http_status: number | null
  remaining_quota: string | null
  error_message: string | null
}

function mapTestStatus(status: string | null, connected: boolean): ConnectionTestStatus | null {
  if (!status) {
    return null
  }
  if (connected || status === 'success' || status === 'healthy') {
    return 'connected'
  }
  if (status === 'failed' || status === 'auth_failed') {
    return 'auth_failed'
  }
  if (status === 'rate_limited') {
    return 'rate_limited'
  }
  return 'provider_error'
}

async function loadSyncHistoryRows(): Promise<SyncHistoryRow[]> {
  const { data, error } = await supabase
    .from('connector_sync_history')
    .select(
      'connector_id, source_id, started_at, finished_at, duration_ms, status, articles_imported, http_status, remaining_quota, error_message',
    )
    .order('started_at', { ascending: false })
    .limit(500)

  if (error) {
    if (isMissingTableError(error)) {
      return []
    }
    throw error
  }

  return (data ?? []) as SyncHistoryRow[]
}

function buildHealthFromHistory(
  connectorId: ConnectorId,
  rows: SyncHistoryRow[],
  credentialStatus: ConnectorHealthRecord['credentialStatus'],
): ConnectorHealthRecord {
  const connectorRuns = rows.filter((row) => row.connector_id === connectorId)
  const syncRuns = connectorRuns.filter((row) => row.source_id !== null)
  const testRuns = connectorRuns.filter((row) => row.source_id === null)

  const latest = connectorRuns[0]
  const latestSync = syncRuns[0]
  const latestTest = testRuns[0]
  const latestSuccess = connectorRuns.find((row) => row.status === 'success')
  const latestFailure = connectorRuns.find((row) => row.status === 'failed')
  const failedCount = connectorRuns.filter((row) => row.status === 'failed').length
  const totalSyncs = connectorRuns.length

  const durations = connectorRuns
    .map((row) => row.duration_ms)
    .filter((value): value is number => typeof value === 'number' && value > 0)
  const averageSyncTimeMs =
    durations.length > 0
      ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
      : null

  const testConnected =
    latestTest?.status === 'success' ||
    (latestTest && latestTest.status !== 'failed' && !latestTest.error_message)

  const syncConnected = latestSuccess !== undefined

  return {
    connectorId,
    connected: testConnected || syncConnected || credentialStatus === 'configured',
    credentialStatus,
    lastTestedAt: latestTest?.finished_at ?? latestTest?.started_at ?? null,
    lastTestStatus: mapTestStatus(
      latestTest?.status ?? null,
      testConnected,
    ),
    lastTestError: latestTest?.error_message ?? null,
    lastSyncAt: latestSync?.finished_at ?? latestSync?.started_at ?? null,
    lastSuccessfulSyncAt:
      latestSuccess?.finished_at ?? latestSuccess?.started_at ?? null,
    lastFailureAt: latestFailure?.finished_at ?? latestFailure?.started_at ?? null,
    lastFailureError: latestFailure?.error_message ?? null,
    articlesImported: syncRuns.reduce((sum, row) => sum + row.articles_imported, 0),
    averageSyncTimeMs,
    remainingQuota: latest?.remaining_quota ?? null,
    lastHttpStatus: latest?.http_status ?? null,
    totalSyncs,
    failedSyncs: failedCount,
    successRate:
      totalSyncs > 0 ? Math.round(((totalSyncs - failedCount) / totalSyncs) * 100) : null,
  }
}

function resolveConnectorType(sourceType: string): string {
  const entry = getConnectorCatalogEntry(sourceType)
  return entry?.type ?? sourceType
}

async function aggregateArticlesImported(
  sources: Source[],
): Promise<Map<ConnectorId, number>> {
  const { data, error } = await supabase.from('articles').select('*')

  if (error) {
    return new Map()
  }

  const articles = normalizeArticles((data ?? []) as Record<string, unknown>[])
  const sourceNameToConnector = new Map<string, ConnectorId>()

  for (const provider of CONNECTOR_PROVIDERS) {
    for (const source of sources) {
      if (resolveConnectorType(source.source_type) === provider.catalogType) {
        sourceNameToConnector.set(source.name, provider.id)
      }
    }
  }

  const counts = new Map<ConnectorId, number>()

  for (const article of articles) {
    const connectorId = sourceNameToConnector.get(article.source ?? '')
    if (connectorId) {
      counts.set(connectorId, (counts.get(connectorId) ?? 0) + 1)
    }
  }

  return counts
}

function aggregateSyncMetrics(sources: Source[]): Map<
  ConnectorId,
  {
    lastSyncAt: string | null
    lastSuccessfulSyncAt: string | null
  }
> {
  const metrics = new Map<
    ConnectorId,
    { lastSyncAt: string | null; lastSuccessfulSyncAt: string | null }
  >()

  for (const provider of CONNECTOR_PROVIDERS) {
    const matching = sources.filter(
      (source) => resolveConnectorType(source.source_type) === provider.catalogType,
    )

    let lastSyncAt: string | null = null
    let lastSuccessfulSyncAt: string | null = null

    for (const source of matching) {
      if (source.last_sync_at) {
        if (!lastSyncAt || new Date(source.last_sync_at) > new Date(lastSyncAt)) {
          lastSyncAt = source.last_sync_at
        }
        if (source.status === 'enabled') {
          if (
            !lastSuccessfulSyncAt ||
            new Date(source.last_sync_at) > new Date(lastSuccessfulSyncAt)
          ) {
            lastSuccessfulSyncAt = source.last_sync_at
          }
        }
      }
    }

    metrics.set(provider.id, { lastSyncAt, lastSuccessfulSyncAt })
  }

  return metrics
}

export async function getConnectorHealthRecords(): Promise<ConnectorHealthRecord[]> {
  const [historyRows, credentialStatuses] = await Promise.all([
    loadSyncHistoryRows(),
    getCredentialStatuses(),
  ])

  return CONNECTOR_PROVIDERS.map((provider) => {
    const readiness = evaluateConnectorReadiness(provider.id, credentialStatuses)
    return buildHealthFromHistory(provider.id, historyRows, readiness.credentialStatus)
  })
}

export async function getEnrichedConnectorHealth(): Promise<ConnectorHealthRecord[]> {
  const [healthRecords, sources] = await Promise.all([
    getConnectorHealthRecords(),
    sourceService.getSources(),
  ])

  const articleCounts = await aggregateArticlesImported(sources)
  const syncMetrics = aggregateSyncMetrics(sources)

  return healthRecords.map((record) => {
    const articlesImported = articleCounts.get(record.connectorId) ?? record.articlesImported
    const sync = syncMetrics.get(record.connectorId)

    return {
      ...record,
      articlesImported,
      lastSyncAt: sync?.lastSyncAt ?? record.lastSyncAt,
      lastSuccessfulSyncAt: sync?.lastSuccessfulSyncAt ?? record.lastSuccessfulSyncAt,
    }
  })
}

/** Sync outcomes are recorded in connector_sync_history by the import pipeline. */
export async function recordSyncSuccess(
  _connectorId: ConnectorId,
  _durationMs: number,
  _importedCount: number,
): Promise<void> {
  // No-op: health is derived from connector_sync_history.
}

/** Sync failures are recorded in connector_sync_history by the import pipeline. */
export async function recordSyncFailure(
  _connectorId: ConnectorId,
  _errorMessage: string,
): Promise<void> {
  // No-op: health is derived from connector_sync_history.
}

export function sourceTypeToConnectorId(sourceType: string): ConnectorId | null {
  const normalized = sourceType.trim().toLowerCase()
  const match = CONNECTOR_PROVIDERS.find(
    (provider) => provider.catalogType.toLowerCase() === normalized,
  )
  return match?.id ?? null
}
