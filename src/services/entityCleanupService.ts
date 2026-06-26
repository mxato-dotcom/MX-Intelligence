import type { Entity } from '@/intelligence/entities/Entity'
import type { ArticleEntityRecord } from '@/intelligence/entities/Entity'
import type { EntityType } from '@/intelligence/entities/EntityType'
import {
  buildProtectedTerms,
  isLowQualityEntity,
  reclassifyEntityType,
  resolveEntityConflicts,
} from '@/intelligence/entities/entityQuality'
import * as articleService from '@/services/articleService'
import * as entityService from '@/services/entityService'

export interface EntityCleanupResult {
  entitiesScanned: number
  reclassified: number
  removed: number
  merged: number
  failed: number
}

export interface ReclassifyResult {
  updates: Array<{ id: string; entity_type: EntityType }>
  reclassified: number
}

export interface RemoveLowQualityResult {
  deleteIds: string[]
  removed: number
}

export interface MergeDuplicateResult {
  keepIds: string[]
  deleteIds: string[]
  updates: Array<{ id: string; entity_type: EntityType }>
  merged: number
  reclassified: number
}

function recordToEntity(record: ArticleEntityRecord): Entity {
  return {
    id: record.id,
    type: record.entity_type,
    text: record.entity_text,
    normalizedValue: record.normalized_text,
    confidence: record.confidence,
    position: 0,
  }
}

export function reclassifyEntities(records: ArticleEntityRecord[]): ReclassifyResult {
  const updates: Array<{ id: string; entity_type: EntityType }> = []
  let reclassified = 0

  for (const record of records) {
    const nextType = reclassifyEntityType(record.entity_text, record.entity_type)
    if (nextType === record.entity_type) {
      continue
    }

    updates.push({ id: record.id, entity_type: nextType })
    reclassified += 1
  }

  return { updates, reclassified }
}

export function mergeDuplicateEntities(records: ArticleEntityRecord[]): MergeDuplicateResult {
  const byNormalized = new Map<string, ArticleEntityRecord[]>()

  for (const record of records) {
    const key = record.normalized_text.toLowerCase()
    if (!key) {
      continue
    }

    const group = byNormalized.get(key) ?? []
    group.push(record)
    byNormalized.set(key, group)
  }

  const keepIds: string[] = []
  const deleteIds: string[] = []
  const updates: Array<{ id: string; entity_type: EntityType }> = []
  let merged = 0
  let reclassified = 0

  for (const group of byNormalized.values()) {
    if (group.length === 1) {
      keepIds.push(group[0].id)
      continue
    }

    const resolved = resolveEntityConflicts(group.map(recordToEntity))
    const winner = resolved[0]
    const winnerType = reclassifyEntityType(winner.text, winner.type)

    const keep =
      group.find((record) => record.entity_type === winnerType) ??
      group.reduce((best, current) => (current.confidence > best.confidence ? current : best), group[0])

    keepIds.push(keep.id)

    if (keep.entity_type !== winnerType) {
      updates.push({ id: keep.id, entity_type: winnerType })
      reclassified += 1
    }

    for (const record of group) {
      if (record.id === keep.id) {
        continue
      }

      deleteIds.push(record.id)
      merged += 1
    }
  }

  return { keepIds, deleteIds, updates, merged, reclassified }
}

export function removeLowQualityEntities(records: ArticleEntityRecord[]): RemoveLowQualityResult {
  const protectedTerms = buildProtectedTerms(records.map(recordToEntity))
  const deleteIds: string[] = []

  for (const record of records) {
    if (isLowQualityEntity(recordToEntity(record), protectedTerms)) {
      deleteIds.push(record.id)
    }
  }

  return { deleteIds, removed: deleteIds.length }
}

async function cleanupArticleEntities(articleId: string): Promise<{
  scanned: number
  reclassified: number
  removed: number
  merged: number
}> {
  const records = await entityService.getEntitiesForArticle(articleId)
  if (records.length === 0) {
    return { scanned: 0, reclassified: 0, removed: 0, merged: 0 }
  }

  const reclassifyResult = reclassifyEntities(records)
  const reclassifiedRecords = records.map((record) => {
    const update = reclassifyResult.updates.find((entry) => entry.id === record.id)
    if (!update) {
      return record
    }
    return { ...record, entity_type: update.entity_type }
  })

  const mergeResult = mergeDuplicateEntities(reclassifiedRecords)
  const survivingIds = new Set(mergeResult.keepIds)
  const survivingRecords = reclassifiedRecords
    .filter((record) => survivingIds.has(record.id))
    .map((record) => {
      const update = mergeResult.updates.find((entry) => entry.id === record.id)
      if (!update) {
        return record
      }
      return { ...record, entity_type: update.entity_type }
    })

  const lowQualityResult = removeLowQualityEntities(survivingRecords)
  const deleteIds = new Set([...mergeResult.deleteIds, ...lowQualityResult.deleteIds])

  for (const update of reclassifyResult.updates) {
    await entityService.updateEntityRecord(update.id, { entity_type: update.entity_type })
  }

  for (const update of mergeResult.updates) {
    if (reclassifyResult.updates.some((entry) => entry.id === update.id)) {
      continue
    }
    await entityService.updateEntityRecord(update.id, { entity_type: update.entity_type })
  }

  for (const id of deleteIds) {
    await entityService.deleteEntityById(id)
  }

  return {
    scanned: records.length,
    reclassified: reclassifyResult.reclassified + mergeResult.reclassified,
    removed: lowQualityResult.removed,
    merged: mergeResult.merged,
  }
}

export async function cleanupEntities(): Promise<EntityCleanupResult> {
  const articles = await articleService.getArticles()

  let entitiesScanned = 0
  let reclassified = 0
  let removed = 0
  let merged = 0
  let failed = 0

  for (const article of articles) {
    try {
      const result = await cleanupArticleEntities(article.id)
      entitiesScanned += result.scanned
      reclassified += result.reclassified
      removed += result.removed
      merged += result.merged
    } catch {
      failed += 1
    }
  }

  return {
    entitiesScanned,
    reclassified,
    removed,
    merged,
    failed,
  }
}
