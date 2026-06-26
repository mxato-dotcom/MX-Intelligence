import type { ArticleEntityRecord, GroupedArticleEntities } from '@/intelligence/entities/Entity'
import type { EntityType } from '@/intelligence/entities/EntityType'
import { isEntityType } from '@/intelligence/entities/EntityType'
import { supabase } from '@/lib/supabase'
import { safeTrim } from '@/lib/safeString'

export interface EntitySearchFilters {
  type?: EntityType
  normalizedText?: string
  minConfidence?: number
  limit?: number
}

export interface TopEntitySummary {
  normalizedText: string
  entityType: EntityType
  count: number
}

export interface EntityDashboardStats {
  totalEntities: number
  topOrganizations: TopEntitySummary[]
  topCountries: TopEntitySummary[]
  topTechnologies: TopEntitySummary[]
  topCompanies: TopEntitySummary[]
}

export interface SourceEntityStats {
  sourceName: string
  articleCount: number
  entityCount: number
  averageEntitiesPerArticle: number
}

function mapRow(row: Record<string, unknown>): ArticleEntityRecord {
  const entityType = String(row.entity_type ?? '')
  return {
    id: String(row.id),
    article_id: String(row.article_id),
    entity_type: isEntityType(entityType) ? entityType : 'Keyword',
    entity_text: String(row.entity_text ?? ''),
    normalized_text: String(row.normalized_text ?? ''),
    confidence: Number(row.confidence ?? 0),
    created_at: String(row.created_at ?? ''),
  }
}

export async function deleteEntitiesForArticle(articleId: string): Promise<void> {
  const { error } = await supabase.from('article_entities').delete().eq('article_id', articleId)

  if (error) {
    throw error
  }
}

export async function insertEntities(
  articleId: string,
  entities: Array<{
    entity_type: EntityType
    entity_text: string
    normalized_text: string
    confidence: number
  }>,
): Promise<void> {
  if (entities.length === 0) {
    return
  }

  const { error } = await supabase.from('article_entities').insert(
    entities.map((entity) => ({
      article_id: articleId,
      entity_type: entity.entity_type,
      entity_text: entity.entity_text,
      normalized_text: entity.normalized_text,
      confidence: entity.confidence,
    })),
  )

  if (error) {
    throw error
  }
}

export async function getEntitiesForArticle(articleId: string): Promise<ArticleEntityRecord[]> {
  const { data, error } = await supabase
    .from('article_entities')
    .select('*')
    .eq('article_id', articleId)
    .order('confidence', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
}

export function groupEntitiesByType(entities: ArticleEntityRecord[]): GroupedArticleEntities[] {
  const groups = new Map<EntityType, ArticleEntityRecord[]>()

  for (const entity of entities) {
    const list = groups.get(entity.entity_type) ?? []
    list.push(entity)
    groups.set(entity.entity_type, list)
  }

  return [...groups.entries()].map(([type, groupEntities]) => ({
    type,
    entities: groupEntities,
  }))
}

export async function findByEntity(
  normalizedText: string,
  type?: EntityType,
): Promise<ArticleEntityRecord[]> {
  const normalized = safeTrim(normalizedText).toLowerCase()
  if (!normalized) {
    return []
  }

  let query = supabase
    .from('article_entities')
    .select('*')
    .eq('normalized_text', normalized)

  if (type) {
    query = query.eq('entity_type', type)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
}

export async function findEntities(filters: EntitySearchFilters = {}): Promise<ArticleEntityRecord[]> {
  let query = supabase.from('article_entities').select('*')

  if (filters.type) {
    query = query.eq('entity_type', filters.type)
  }

  if (filters.normalizedText) {
    query = query.eq('normalized_text', safeTrim(filters.normalizedText).toLowerCase())
  }

  if (filters.minConfidence !== undefined) {
    query = query.gte('confidence', filters.minConfidence)
  }

  const limit = filters.limit ?? 100
  const { data, error } = await query
    .order('confidence', { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
}

export async function getTopEntities(
  type: EntityType,
  limit = 5,
): Promise<TopEntitySummary[]> {
  const { data, error } = await supabase
    .from('article_entities')
    .select('entity_type, normalized_text')
    .eq('entity_type', type)

  if (error) {
    throw error
  }

  const counts = new Map<string, { count: number; display: string }>()

  for (const row of data ?? []) {
    const record = row as Record<string, unknown>
    const normalized = String(record.normalized_text ?? '').toLowerCase()
    const display = String(record.entity_text ?? normalized)
    if (!normalized) {
      continue
    }

    const existing = counts.get(normalized)
    if (!existing) {
      counts.set(normalized, { count: 1, display })
    } else {
      counts.set(normalized, { count: existing.count + 1, display: existing.display })
    }
  }

  return [...counts.entries()]
    .sort((left, right) => right[1].count - left[1].count)
    .slice(0, limit)
    .map(([, entry]) => ({
      normalizedText: entry.display,
      entityType: type,
      count: entry.count,
    }))
}

export async function getTotalEntityCount(): Promise<number> {
  const { count, error } = await supabase
    .from('article_entities')
    .select('*', { count: 'exact', head: true })

  if (error) {
    throw error
  }

  return count ?? 0
}

export async function getEntityDashboardStats(): Promise<EntityDashboardStats> {
  const [
    totalEntities,
    topOrganizations,
    topCountries,
    topTechnologies,
    topCompanies,
  ] = await Promise.all([
    getTotalEntityCount(),
    getTopEntities('Organization', 5),
    getTopEntities('Country', 5),
    getTopEntities('Technology', 5),
    getTopEntities('Company', 5),
  ])

  return {
    totalEntities,
    topOrganizations,
    topCountries,
    topTechnologies,
    topCompanies,
  }
}

export async function getSourceEntityStats(sourceName: string): Promise<SourceEntityStats> {
  const normalizedSource = safeTrim(sourceName)
  const { data: articles, error: articlesError } = await supabase
    .from('articles')
    .select('id')
    .eq('source', normalizedSource)

  if (articlesError) {
    throw articlesError
  }

  const articleIds = (articles ?? []).map((row) => String((row as Record<string, unknown>).id))
  const articleCount = articleIds.length

  if (articleCount === 0) {
    return {
      sourceName: normalizedSource,
      articleCount: 0,
      entityCount: 0,
      averageEntitiesPerArticle: 0,
    }
  }

  const { count, error: entityError } = await supabase
    .from('article_entities')
    .select('*', { count: 'exact', head: true })
    .in('article_id', articleIds)

  if (entityError) {
    throw entityError
  }

  const entityCount = count ?? 0

  return {
    sourceName: normalizedSource,
    articleCount,
    entityCount,
    averageEntitiesPerArticle:
      articleCount === 0 ? 0 : Math.round((entityCount / articleCount) * 10) / 10,
  }
}
