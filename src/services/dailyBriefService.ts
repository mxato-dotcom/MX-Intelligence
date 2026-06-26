import type {
  BriefRiskLevel,
  BriefStatus,
  IntelligenceBriefPayload,
  IntelligenceDailyBrief,
} from '@/intelligence/brief/BriefTypes'
import { isEntityType } from '@/intelligence/entities/EntityType'
import { briefEngine, BriefEngine } from '@/intelligence/brief/BriefEngine'
import type { BriefGeneratorProvider } from '@/intelligence/brief/providers/BriefGeneratorProvider'
import { syncAlertsForBrief } from '@/services/briefAlertSyncService'
import { supabase } from '@/lib/supabase'
import { isMissingColumnError, isMissingTableError } from '@/lib/supabaseErrors'
import { safeString } from '@/lib/safeString'

interface DailyBriefRow {
  id: string
  title?: string | null
  summary?: string | null
  executive_summary?: string | null
  risk_level?: string | null
  importance_score?: number | null
  article_count?: number | null
  cluster_count?: number | null
  entity_count?: number | null
  generated_at?: string | null
  created_at?: string | null
  status?: string | null
  reviewed_at?: string | null
  published_at?: string | null
  archived_at?: string | null
  brief_data?: IntelligenceBriefPayload | null
  content?: string | null
}

function parseRiskLevel(value: string | null | undefined): BriefRiskLevel {
  switch (value) {
    case 'Critical':
    case 'High':
    case 'Elevated':
    case 'Moderate':
    case 'Low':
      return value
    default:
      return 'Low'
  }
}

function parseBriefStatus(value: string | null | undefined): BriefStatus {
  switch (value) {
    case 'draft':
    case 'reviewed':
    case 'published':
    case 'archived':
      return value
    default:
      return 'draft'
  }
}

function mapBriefRow(row: DailyBriefRow): IntelligenceDailyBrief {
  const payload = (row.brief_data ?? {}) as IntelligenceBriefPayload

  return {
    id: String(row.id),
    title: safeString(row.title) || 'Intelligence Brief',
    summary: safeString(row.summary) || safeString(row.content),
    executiveSummary:
      safeString(row.executive_summary) || safeString(row.summary) || safeString(row.content),
    riskLevel: parseRiskLevel(row.risk_level),
    importanceScore: Number(row.importance_score ?? 0),
    articleCount: Number(row.article_count ?? 0),
    clusterCount: Number(row.cluster_count ?? 0),
    entityCount: Number(row.entity_count ?? 0),
    generatedAt: safeString(row.generated_at) || safeString(row.created_at) || new Date().toISOString(),
    createdAt: safeString(row.created_at) || new Date().toISOString(),
    status: parseBriefStatus(row.status),
    reviewedAt: safeString(row.reviewed_at) || null,
    publishedAt: safeString(row.published_at) || null,
    archivedAt: safeString(row.archived_at) || null,
    payload: {
      sections: payload.sections ?? [],
      topEvent: payload.topEvent ?? null,
      topTechnology: payload.topTechnology ?? null,
      topOrganization: payload.topOrganization ?? null,
      topCountry: payload.topCountry ?? null,
      sourcesUsed: payload.sourcesUsed ?? [],
      relatedClusterIds: payload.relatedClusterIds ?? [],
      relatedArticleIds: payload.relatedArticleIds ?? [],
      relatedEntities: (payload.relatedEntities ?? []).map((entity) => ({
        type: isEntityType(entity.type) ? entity.type : 'Keyword',
        label: entity.label,
        count: entity.count,
      })),
      overallConfidence: Number(payload.overallConfidence ?? 0),
    },
  }
}

async function queryLatestBriefRow(): Promise<DailyBriefRow | null> {
  const byGeneratedAt = await supabase
    .from('daily_briefs')
    .select('*')
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!byGeneratedAt.error) {
    return (byGeneratedAt.data as DailyBriefRow | null) ?? null
  }

  if (isMissingTableError(byGeneratedAt.error)) {
    return null
  }

  if (isMissingColumnError(byGeneratedAt.error)) {
    const byCreatedAt = await supabase
      .from('daily_briefs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!byCreatedAt.error) {
      return (byCreatedAt.data as DailyBriefRow | null) ?? null
    }

    if (isMissingTableError(byCreatedAt.error)) {
      return null
    }

    throw byCreatedAt.error
  }

  throw byGeneratedAt.error
}

async function queryLatestBriefByStatus(status: BriefStatus): Promise<DailyBriefRow | null> {
  const primary = await supabase
    .from('daily_briefs')
    .select('*')
    .eq('status', status)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!primary.error) {
    return (primary.data as DailyBriefRow | null) ?? null
  }

  if (isMissingTableError(primary.error)) {
    return null
  }

  if (isMissingColumnError(primary.error)) {
    const fallback = await supabase
      .from('daily_briefs')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!fallback.error) {
      return (fallback.data as DailyBriefRow | null) ?? null
    }

    if (isMissingTableError(fallback.error)) {
      return null
    }

    if (isMissingColumnError(fallback.error)) {
      return null
    }

    throw fallback.error
  }

  throw primary.error
}

async function updateBriefRow(
  id: string,
  patch: Record<string, string | null>,
): Promise<IntelligenceDailyBrief | null> {
  const { data, error } = await supabase
    .from('daily_briefs')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (isMissingTableError(error)) {
      return null
    }

    throw error
  }

  return mapBriefRow(data as DailyBriefRow)
}

export async function generateAndStoreDailyBrief(
  provider?: BriefGeneratorProvider,
): Promise<IntelligenceDailyBrief | null> {
  const engine = provider ? new BriefEngine(provider) : briefEngine
  const generated = await engine.buildGenerationResult()
  const now = new Date().toISOString()

  const insertPayload: Record<string, unknown> = {
    title: generated.title,
    summary: generated.summary,
    executive_summary: generated.executiveSummary,
    risk_level: generated.riskLevel,
    importance_score: generated.importanceScore,
    article_count: generated.articleCount,
    cluster_count: generated.clusterCount,
    entity_count: generated.entityCount,
    generated_at: now,
    created_at: now,
    brief_data: generated.payload,
    status: 'draft',
  }

  const { data, error } = await supabase.from('daily_briefs').insert(insertPayload).select().single()

  if (error) {
    if (isMissingTableError(error)) {
      return null
    }

    if (isMissingColumnError(error)) {
      const { status: _status, ...withoutStatus } = insertPayload
      const retry = await supabase.from('daily_briefs').insert(withoutStatus).select().single()

      if (retry.error) {
        if (isMissingTableError(retry.error)) {
          return null
        }

        throw retry.error
      }

      const mappedRetry = mapBriefRow(retry.data as DailyBriefRow)
      await syncAlertsForBrief(mappedRetry)
      return mappedRetry
    }

    throw error
  }

  const mapped = mapBriefRow(data as DailyBriefRow)
  await syncAlertsForBrief(mapped)
  return mapped
}

export async function getLatestDailyBrief(): Promise<IntelligenceDailyBrief | null> {
  const row = await queryLatestBriefRow()
  return row ? mapBriefRow(row) : null
}

/** Latest published brief, or latest draft if none published. */
export async function getDashboardBrief(): Promise<IntelligenceDailyBrief | null> {
  const published = await queryLatestBriefByStatus('published')
  if (published) {
    return mapBriefRow(published)
  }

  const draft = await queryLatestBriefByStatus('draft')
  if (draft) {
    return mapBriefRow(draft)
  }

  return getLatestDailyBrief()
}

export async function getDailyBriefById(id: string): Promise<IntelligenceDailyBrief | null> {
  const { data, error } = await supabase.from('daily_briefs').select('*').eq('id', id).maybeSingle()

  if (error) {
    if (isMissingTableError(error)) {
      return null
    }

    throw error
  }

  if (!data) {
    return null
  }

  return mapBriefRow(data as DailyBriefRow)
}

export async function listDailyBriefHistory(limit = 50): Promise<IntelligenceDailyBrief[]> {
  const primary = await supabase
    .from('daily_briefs')
    .select('*')
    .order('generated_at', { ascending: false })
    .limit(limit)

  if (!primary.error) {
    return (primary.data ?? []).map((row) => mapBriefRow(row as DailyBriefRow))
  }

  if (isMissingTableError(primary.error)) {
    return []
  }

  if (isMissingColumnError(primary.error)) {
    const fallback = await supabase
      .from('daily_briefs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (!fallback.error) {
      return (fallback.data ?? []).map((row) => mapBriefRow(row as DailyBriefRow))
    }

    if (isMissingTableError(fallback.error)) {
      return []
    }

    throw fallback.error
  }

  throw primary.error
}

export async function getDailyBriefCount(): Promise<number> {
  const { count, error } = await supabase
    .from('daily_briefs')
    .select('*', { count: 'exact', head: true })

  if (error) {
    if (isMissingTableError(error)) {
      return 0
    }

    throw error
  }

  return count ?? 0
}

export async function markBriefReviewed(id: string): Promise<IntelligenceDailyBrief | null> {
  const existing = await getDailyBriefById(id)
  if (!existing) {
    return null
  }

  if (existing.status !== 'draft') {
    throw new Error('Only draft briefs can be marked as reviewed')
  }

  const now = new Date().toISOString()
  return updateBriefRow(id, {
    status: 'reviewed',
    reviewed_at: now,
    archived_at: null,
  })
}

export async function publishBrief(id: string): Promise<IntelligenceDailyBrief | null> {
  const existing = await getDailyBriefById(id)
  if (!existing) {
    return null
  }

  if (existing.status !== 'draft' && existing.status !== 'reviewed') {
    throw new Error('Only draft or reviewed briefs can be published')
  }

  const now = new Date().toISOString()
  const patch: Record<string, string | null> = {
    status: 'published',
    published_at: now,
    archived_at: null,
  }

  if (!existing.reviewedAt) {
    patch.reviewed_at = now
  }

  const updated = await updateBriefRow(id, patch)
  if (updated) {
    await syncAlertsForBrief(updated)
  }

  return updated
}

export async function archiveBrief(id: string): Promise<IntelligenceDailyBrief | null> {
  const existing = await getDailyBriefById(id)
  if (!existing) {
    return null
  }

  if (existing.status === 'archived') {
    throw new Error('Brief is already archived')
  }

  const now = new Date().toISOString()
  return updateBriefRow(id, {
    status: 'archived',
    archived_at: now,
  })
}
