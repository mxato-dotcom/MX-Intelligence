import type {
  BriefRiskLevel,
  IntelligenceBriefPayload,
  IntelligenceDailyBrief,
} from '@/intelligence/brief/BriefTypes'
import { isEntityType } from '@/intelligence/entities/EntityType'
import { briefEngine } from '@/intelligence/brief/BriefEngine'
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

function mapBriefRow(row: DailyBriefRow): IntelligenceDailyBrief {
  const payload = (row.brief_data ?? {}) as IntelligenceBriefPayload

  return {
    id: String(row.id),
    title: safeString(row.title) || 'Intelligence Brief',
    summary: safeString(row.summary) || safeString(row.content),
    executiveSummary: safeString(row.executive_summary) || safeString(row.summary) || safeString(row.content),
    riskLevel: parseRiskLevel(row.risk_level),
    importanceScore: Number(row.importance_score ?? 0),
    articleCount: Number(row.article_count ?? 0),
    clusterCount: Number(row.cluster_count ?? 0),
    entityCount: Number(row.entity_count ?? 0),
    generatedAt: safeString(row.generated_at) || safeString(row.created_at) || new Date().toISOString(),
    createdAt: safeString(row.created_at) || new Date().toISOString(),
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

export async function generateAndStoreDailyBrief(): Promise<IntelligenceDailyBrief | null> {
  const generated = await briefEngine.buildGenerationResult()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('daily_briefs')
    .insert({
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
    })
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

export async function getLatestDailyBrief(): Promise<IntelligenceDailyBrief | null> {
  const row = await queryLatestBriefRow()
  return row ? mapBriefRow(row) : null
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

export async function listDailyBriefHistory(limit = 30): Promise<IntelligenceDailyBrief[]> {
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
