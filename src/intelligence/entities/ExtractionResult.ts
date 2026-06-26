import type { Entity } from '@/intelligence/entities/Entity'

export interface ExtractionResult {
  entities: Entity[]
  sourceTextLength: number
  extractedAt: string
}

export function createEmptyExtractionResult(): ExtractionResult {
  return {
    entities: [],
    sourceTextLength: 0,
    extractedAt: new Date().toISOString(),
  }
}

export function mergeExtractionResults(results: ExtractionResult[]): ExtractionResult {
  const entities: Entity[] = []
  const seen = new Set<string>()

  for (const result of results) {
    for (const entity of result.entities) {
      const key = `${entity.type}::${entity.normalizedValue}`
      if (seen.has(key)) {
        continue
      }
      seen.add(key)
      entities.push(entity)
    }
  }

  return {
    entities,
    sourceTextLength: results.reduce((sum, result) => sum + result.sourceTextLength, 0),
    extractedAt: new Date().toISOString(),
  }
}
