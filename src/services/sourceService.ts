import { supabase } from '@/lib/supabase'
import { trustScoreEngine } from '@/intelligence/scoring/TrustScoreEngine'
import type { CreateSourceInput, Source, UpdateSourceInput } from '@/types/source'

export async function getSources(): Promise<Source[]> {
  const { data, error } = await supabase
    .from('sources')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data as Source[]
}

export async function getSourceById(id: string): Promise<Source | null> {
  const { data, error } = await supabase.from('sources').select('*').eq('id', id).maybeSingle()

  if (error) {
    throw error
  }

  return data as Source | null
}

export async function createSource(data: CreateSourceInput, userId: string): Promise<Source> {
  const { data: row, error } = await supabase
    .from('sources')
    .insert({
      user_id: userId,
      name: data.name.trim(),
      source_type: data.source_type,
      category: data.category,
      url: data.url.trim(),
      description: data.description.trim(),
      status: data.status,
      priority: data.priority,
      update_interval: data.update_interval.trim(),
      trust_score: data.trust_score,
      active: data.active,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  const created = row as Source
  trustScoreEngine.setManualOverride(created.id, created.trust_score)
  await trustScoreEngine.applyScoreToSource(created)

  return created
}

export async function updateSource(id: string, data: UpdateSourceInput): Promise<Source> {
  const updates: Record<string, unknown> = {}

  if (data.name !== undefined) updates.name = data.name.trim()
  if (data.source_type !== undefined) updates.source_type = data.source_type
  if (data.category !== undefined) updates.category = data.category
  if (data.url !== undefined) updates.url = data.url.trim()
  if (data.description !== undefined) updates.description = data.description.trim()
  if (data.status !== undefined) updates.status = data.status
  if (data.priority !== undefined) updates.priority = data.priority
  if (data.update_interval !== undefined) updates.update_interval = data.update_interval.trim()
  if (data.trust_score !== undefined) updates.trust_score = data.trust_score
  if (data.active !== undefined) updates.active = data.active

  const { data: row, error } = await supabase
    .from('sources')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }

  const updated = row as Source

  if (data.trust_score !== undefined) {
    trustScoreEngine.setManualOverride(id, data.trust_score)
    await trustScoreEngine.applyScoreToSource(updated)
  }

  return updated
}

export async function updateSourceScoringFields(
  id: string,
  trustScore: number,
  status: string,
): Promise<Source> {
  const { data, error } = await supabase
    .from('sources')
    .update({
      trust_score: trustScore,
      status,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as Source
}

export async function deleteSource(id: string): Promise<void> {
  const { error } = await supabase.from('sources').delete().eq('id', id)

  if (error) {
    throw error
  }
}

export async function toggleSourceActive(id: string, active: boolean): Promise<Source> {
  const { data, error } = await supabase
    .from('sources')
    .update({ active })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as Source
}

export async function updateSourceAfterImport(id: string, importedCount: number): Promise<Source> {
  const existing = await getSourceById(id)
  const currentItems = existing?.items_collected ?? 0

  const { data, error } = await supabase
    .from('sources')
    .update({
      last_sync_at: new Date().toISOString(),
      items_collected: currentItems + importedCount,
      status: 'enabled',
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as Source
}

export async function updateSourceLastSync(id: string): Promise<Source> {
  const { data, error } = await supabase
    .from('sources')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as Source
}
