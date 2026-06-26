import type { EntityType } from '@/intelligence/entities/EntityType'
import { isEntityType } from '@/intelligence/entities/EntityType'
import { safeTrim } from '@/lib/safeString'

export function buildEntityId(entityType: EntityType, normalizedText: string): string {
  return `entity:${entityType}:${safeTrim(normalizedText).toLowerCase()}`
}

export function parseEntityId(entityId: string): { entityType: EntityType; normalizedText: string } | null {
  const decoded = decodeURIComponent(entityId)
  if (!decoded.startsWith('entity:')) {
    return null
  }

  const withoutPrefix = decoded.slice('entity:'.length)
  const separatorIndex = withoutPrefix.indexOf(':')
  if (separatorIndex <= 0) {
    return null
  }

  const entityType = withoutPrefix.slice(0, separatorIndex)
  const normalizedText = withoutPrefix.slice(separatorIndex + 1)

  if (!isEntityType(entityType) || !normalizedText) {
    return null
  }

  return { entityType, normalizedText }
}

export function isEntityId(value: string): boolean {
  return parseEntityId(value) !== null
}
