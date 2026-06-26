import type { ConnectorId } from '@/types/connectorSettings'

export type SyncRunStatus = 'running' | 'success' | 'failed' | 'partial'

export interface ConnectorSyncHistoryRecord {
  id: string
  connectorId: ConnectorId
  sourceId: string | null
  startedAt: string
  finishedAt: string | null
  durationMs: number | null
  status: SyncRunStatus
  articlesDownloaded: number
  articlesImported: number
  duplicates: number
  errors: number
  updatedCount: number
  httpStatus: number | null
  remainingQuota: string | null
  errorMessage: string | null
}

export interface ConnectorSyncLogRecord {
  id: string
  syncId: string | null
  connectorId: ConnectorId
  requestAt: string
  responseAt: string | null
  durationMs: number | null
  httpStatus: number | null
  errorMessage: string | null
  retryCount: number
  remainingQuota: string | null
  message: string | null
}

export interface CreateSyncRunInput {
  connectorId: ConnectorId
  sourceId?: string | null
}

export interface CompleteSyncRunInput {
  status: SyncRunStatus
  durationMs: number
  articlesDownloaded: number
  articlesImported: number
  duplicates: number
  errors: number
  updatedCount: number
  httpStatus?: number | null
  remainingQuota?: string | null
  errorMessage?: string | null
}
