import type { Entity } from '@/intelligence/entities/Entity'
import type { EntityType } from '@/intelligence/entities/EntityType'

function normalizeKey(type: EntityType, value: string): string {
  return `${type}::${value.trim().toLowerCase()}`
}

export function normalizeEntityValue(text: string, canonical?: string): string {
  if (canonical) {
    return canonical
  }

  const trimmed = text.trim()
  if (!trimmed) {
    return ''
  }

  return trimmed
    .split(/\s+/)
    .map((word) => {
      if (word.length === 0) {
        return word
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

export class EntityRegistry {
  private readonly seen = new Set<string>()
  private readonly entities: Entity[] = []

  register(candidate: Omit<Entity, 'id'> & { id?: string }): Entity | null {
    const normalizedValue = normalizeEntityValue(candidate.normalizedValue || candidate.text)
    if (!normalizedValue) {
      return null
    }

    const key = normalizeKey(candidate.type, normalizedValue)
    if (this.seen.has(key)) {
      return null
    }

    this.seen.add(key)

    const entity: Entity = {
      id: candidate.id ?? key,
      type: candidate.type,
      text: candidate.text.trim() || normalizedValue,
      normalizedValue,
      confidence: candidate.confidence,
      position: candidate.position,
    }

    this.entities.push(entity)
    return entity
  }

  getEntities(): Entity[] {
    return [...this.entities]
  }

  clear(): void {
    this.seen.clear()
    this.entities.length = 0
  }
}
