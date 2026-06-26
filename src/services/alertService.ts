import { supabase } from '@/lib/supabase'
import { isMissingTableError } from '@/lib/supabaseErrors'
import { safeString } from '@/lib/safeString'
import type {
  AlertRow,
  AlertSeverity,
  AlertStats,
  AlertStatus,
  CreateAlertInput,
  IntelligenceAlert,
} from '@/types/alert'

function parseSeverity(value: string | null | undefined): AlertSeverity {
  switch (value) {
    case 'info':
    case 'low':
    case 'medium':
    case 'high':
    case 'critical':
      return value
    default:
      return 'info'
  }
}

function parseStatus(value: string | null | undefined): AlertStatus {
  switch (value) {
    case 'unread':
    case 'read':
    case 'archived':
      return value
    default:
      return 'unread'
  }
}

function mapAlertRow(row: AlertRow): IntelligenceAlert {
  return {
    id: String(row.id),
    title: safeString(row.title) || 'Intelligence alert',
    message: safeString(row.message),
    severity: parseSeverity(row.severity),
    category: safeString(row.category) || 'general',
    relatedBriefId: safeString(row.related_brief_id) || null,
    relatedArticleId: safeString(row.related_article_id) || null,
    relatedEntity: safeString(row.related_entity) || null,
    createdAt: safeString(row.created_at) || new Date().toISOString(),
    readAt: safeString(row.read_at) || null,
    status: parseStatus(row.status),
  }
}

export function computeAlertStats(alerts: IntelligenceAlert[]): AlertStats {
  return {
    total: alerts.length,
    unread: alerts.filter((alert) => alert.status === 'unread').length,
    critical: alerts.filter((alert) => alert.severity === 'critical').length,
    high: alerts.filter((alert) => alert.severity === 'high').length,
    archived: alerts.filter((alert) => alert.status === 'archived').length,
  }
}

export async function getAlerts(): Promise<IntelligenceAlert[]> {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    if (isMissingTableError(error)) {
      return []
    }

    throw error
  }

  return (data ?? []).map((row) => mapAlertRow(row as AlertRow))
}

export async function getUnreadAlerts(): Promise<IntelligenceAlert[]> {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('status', 'unread')
    .order('created_at', { ascending: false })

  if (error) {
    if (isMissingTableError(error)) {
      return []
    }

    throw error
  }

  return (data ?? []).map((row) => mapAlertRow(row as AlertRow))
}

export async function getUnreadAlertCount(): Promise<number> {
  const { count, error } = await supabase
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'unread')

  if (error) {
    if (isMissingTableError(error)) {
      return 0
    }

    throw error
  }

  return count ?? 0
}

export async function createAlert(input: CreateAlertInput, userId: string): Promise<IntelligenceAlert | null> {
  const { data, error } = await supabase
    .from('alerts')
    .insert({
      user_id: userId,
      title: input.title,
      message: input.message,
      severity: input.severity,
      category: input.category,
      related_brief_id: input.relatedBriefId ?? null,
      related_article_id: input.relatedArticleId ?? null,
      related_entity: input.relatedEntity ?? null,
      status: 'unread',
    })
    .select()
    .single()

  if (error) {
    if (isMissingTableError(error)) {
      return null
    }

    throw error
  }

  return mapAlertRow(data as AlertRow)
}

export async function markAlertRead(id: string): Promise<IntelligenceAlert | null> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('alerts')
    .update({ status: 'read', read_at: now })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (isMissingTableError(error)) {
      return null
    }

    throw error
  }

  return mapAlertRow(data as AlertRow)
}

export async function markAllAlertsRead(): Promise<number> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('alerts')
    .update({ status: 'read', read_at: now })
    .eq('status', 'unread')
    .select('id')

  if (error) {
    if (isMissingTableError(error)) {
      return 0
    }

    throw error
  }

  return (data ?? []).length
}

export async function archiveAlert(id: string): Promise<IntelligenceAlert | null> {
  const { data, error } = await supabase
    .from('alerts')
    .update({ status: 'archived' })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (isMissingTableError(error)) {
      return null
    }

    throw error
  }

  return mapAlertRow(data as AlertRow)
}

export async function deleteAlert(id: string): Promise<void> {
  const { error } = await supabase.from('alerts').delete().eq('id', id)

  if (error) {
    if (isMissingTableError(error)) {
      return
    }

    throw error
  }
}
