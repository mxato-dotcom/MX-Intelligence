import { getConnector } from '@/intelligence/connector/connectorRegistry'
import { runConnectorImportPipeline } from '@/services/connectorImportPipeline'
import { enqueueSourceSync } from '@/services/schedulerService'
import { sourceTypeToConnectorId } from '@/services/connectorHealthService'
import * as sourceService from '@/services/sourceService'
import type { ConnectorId } from '@/types/connectorSettings'
import { connectorIdToCatalogType } from '@/types/connectorSettings'
import type { FeedImportResult } from '@/types/rss'
import type { Source } from '@/types/source'

export interface ConnectorSyncAggregateResult {
  success: boolean
  imported: number
  skipped: number
  updated: number
  failed: number
  downloaded: number
  durationMs: number
  sourcesSynced: number
  errorMessage?: string
}

function aggregateResults(results: FeedImportResult[]): ConnectorSyncAggregateResult {
  const aggregated = {
    imported: 0,
    skipped: 0,
    updated: 0,
    failed: 0,
    downloaded: 0,
    durationMs: 0,
  }

  for (const result of results) {
    aggregated.imported += result.imported
    aggregated.skipped += result.skipped
    aggregated.updated += result.updated
    aggregated.failed += result.failed
    aggregated.downloaded += result.downloaded
    aggregated.durationMs += result.durationMs
  }

  return {
    success: aggregated.failed === 0 || aggregated.imported > 0,
    ...aggregated,
    sourcesSynced: results.length,
  }
}

export async function syncSource(
  source: Source,
  userId: string,
  selectedIds?: string[],
): Promise<FeedImportResult> {
  const connector = getConnector(source.source_type)
  if (!connector.implemented) {
    throw new Error('Connector not implemented yet.')
  }

  return runConnectorImportPipeline(source, userId, selectedIds)
}

export async function syncConnector(
  connectorId: ConnectorId,
  userId: string,
): Promise<ConnectorSyncAggregateResult> {
  const catalogType = connectorIdToCatalogType(connectorId)
  const sources = await sourceService.getSources()
  const matching = sources.filter(
    (source) =>
      source.source_type.trim().toLowerCase() === catalogType.toLowerCase() &&
      source.active &&
      source.status === 'enabled',
  )

  if (matching.length === 0) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      updated: 0,
      failed: 0,
      downloaded: 0,
      durationMs: 0,
      sourcesSynced: 0,
      errorMessage: `No enabled sources for ${catalogType}`,
    }
  }

  const results: FeedImportResult[] = []

  for (const source of matching) {
    try {
      const result = await syncSource(source, userId)
      results.push(result)
    } catch (error) {
      results.push({
        downloaded: 0,
        imported: 0,
        skipped: 0,
        updated: 0,
        failed: 1,
        durationMs: 0,
      })
    }
  }

  return aggregateResults(results)
}

export async function enqueueConnectorSync(
  connectorId: ConnectorId,
  userId: string,
): Promise<{ success: boolean; errorMessage?: string }> {
  const catalogType = connectorIdToCatalogType(connectorId)
  const sources = await sourceService.getSources()
  const matching = sources.filter(
    (source) =>
      source.source_type.trim().toLowerCase() === catalogType.toLowerCase() &&
      source.active &&
      source.status === 'enabled',
  )

  if (matching.length === 0) {
    return {
      success: false,
      errorMessage: `No enabled sources for ${catalogType}. Create a source first.`,
    }
  }

  for (const source of matching) {
    await enqueueSourceSync(source, userId)
  }

  return { success: true }
}

export function resolveConnectorIdForSource(source: Source): ConnectorId | null {
  return sourceTypeToConnectorId(source.source_type)
}
