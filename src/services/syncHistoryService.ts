import { supabase } from '@/lib/supabase'
import { isMissingTableError } from '@/lib/supabaseErrors'
import type { ConnectorId } from '@/types/connectorSettings'
import type {
  CompleteSyncRunInput,
  ConnectorSyncHistoryRecord,
  ConnectorSyncLogRecord,
  CreateSyncRunInput,
  SyncRunStatus,
} from '@/types/syncHistory'

interface HistoryRow {
  id: string
  connector_id: string
  source_id: string | null
  started_at: string
  finished_at: string | null
  duration_ms: number | null
  status: string
  articles_downloaded: number
  articles_imported: number
  duplicates: number
  errors: number
  updated_count: number
  http_status: number | null
  remaining_quota: string | null
  error_message: string | null
}

interface LogRow {
  id: string
  sync_id: string | null
  connector_id: string
  request_at: string
  response_at: string | null
  duration_ms: number | null
  http_status: number | null
  error_message: string | null
  retry_count: number
  remaining_quota: string | null
  message: string | null
}

function mapHistoryRow(row: HistoryRow): ConnectorSyncHistoryRecord {
  return {
    id: row.id,
    connectorId: row.connector_id as ConnectorId,
    sourceId: row.source_id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    durationMs: row.duration_ms,
    status: row.status as SyncRunStatus,
    articlesDownloaded: row.articles_downloaded,
    articlesImported: row.articles_imported,
    duplicates: row.duplicates,
    errors: row.errors,
    updatedCount: row.updated_count,
    httpStatus: row.http_status,
    remainingQuota: row.remaining_quota,
    errorMessage: row.error_message,
  }
}

function mapLogRow(row: LogRow): ConnectorSyncLogRecord {
  return {
    id: row.id,
    syncId: row.sync_id,
    connectorId: row.connector_id as ConnectorId,
    requestAt: row.request_at,
    responseAt: row.response_at,
    durationMs: row.duration_ms,
    httpStatus: row.http_status,
    errorMessage: row.error_message,
    retryCount: row.retry_count,
    remainingQuota: row.remaining_quota,
    message: row.message,
  }
}

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

export async function createSyncRun(input: CreateSyncRunInput): Promise<string | null> {
  const userId = await getUserId()
  if (!userId) {
    return null
  }

  const { data, error } = await supabase
    .from('connector_sync_history')
    .insert({
      user_id: userId,
      connector_id: input.connectorId,
      source_id: input.sourceId ?? null,
      status: 'running',
    })
    .select('id')
    .single()

  if (error) {
    if (isMissingTableError(error)) {
      return null
    }
    throw error
  }

  return data?.id ? String(data.id) : null
}

export async function completeSyncRun(
  syncId: string | null,
  input: CompleteSyncRunInput,
): Promise<void> {
  if (!syncId) {
    return
  }

  const { error } = await supabase
    .from('connector_sync_history')
    .update({
      finished_at: new Date().toISOString(),
      duration_ms: input.durationMs,
      status: input.status,
      articles_downloaded: input.articlesDownloaded,
      articles_imported: input.articlesImported,
      duplicates: input.duplicates,
      errors: input.errors,
      updated_count: input.updatedCount,
      http_status: input.httpStatus ?? null,
      remaining_quota: input.remainingQuota ?? null,
      error_message: input.errorMessage ?? null,
    })
    .eq('id', syncId)

  if (error && !isMissingTableError(error)) {
    throw error
  }
}

export async function logSyncEvent(input: {
  syncId?: string | null
  connectorId: ConnectorId
  durationMs?: number
  httpStatus?: number | null
  errorMessage?: string | null
  retryCount?: number
  remainingQuota?: string | null
  message?: string | null
}): Promise<void> {
  const userId = await getUserId()
  if (!userId) {
    return
  }

  const now = new Date().toISOString()
  const { error } = await supabase.from('connector_sync_logs').insert({
    user_id: userId,
    sync_id: input.syncId ?? null,
    connector_id: input.connectorId,
    request_at: now,
    response_at: now,
    duration_ms: input.durationMs ?? null,
    http_status: input.httpStatus ?? null,
    error_message: input.errorMessage ?? null,
    retry_count: input.retryCount ?? 0,
    remaining_quota: input.remainingQuota ?? null,
    message: input.message ?? null,
  })

  if (error && !isMissingTableError(error)) {
    throw error
  }
}

export async function getSyncHistory(
  connectorId?: ConnectorId,
  limit = 50,
): Promise<ConnectorSyncHistoryRecord[]> {
  let query = supabase
    .from('connector_sync_history')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit)

  if (connectorId) {
    query = query.eq('connector_id', connectorId)
  }

  const { data, error } = await query

  if (error) {
    if (isMissingTableError(error)) {
      return []
    }
    throw error
  }

  return (data ?? []).map((row) => mapHistoryRow(row as HistoryRow))
}

export async function getSyncLogs(limit = 100): Promise<ConnectorSyncLogRecord[]> {
  const { data, error } = await supabase
    .from('connector_sync_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    if (isMissingTableError(error)) {
      return []
    }
    throw error
  }

  return (data ?? []).map((row) => mapLogRow(row as LogRow))
}

export async function getLatestSyncForConnector(
  connectorId: ConnectorId,
): Promise<ConnectorSyncHistoryRecord | null> {
  const history = await getSyncHistory(connectorId, 1)
  return history[0] ?? null
}
