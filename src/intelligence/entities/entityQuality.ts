import type { Entity } from '@/intelligence/entities/Entity'
import type { EntityType } from '@/intelligence/entities/EntityType'
import { DICTIONARY_LOOKUP } from '@/intelligence/entities/dictionaries'
import { safeTrim } from '@/lib/safeString'

export const LOW_VALUE_KEYWORDS = new Set([
  'about',
  'after',
  'again',
  'against',
  'among',
  'attack',
  'attacks',
  'because',
  'before',
  'being',
  'between',
  'biggest',
  'component',
  'components',
  'could',
  'during',
  'flowers',
  'from',
  'have',
  'into',
  'latest',
  'major',
  'many',
  'more',
  'most',
  'news',
  'other',
  'over',
  'report',
  'reports',
  'said',
  'says',
  'some',
  'such',
  'than',
  'that',
  'their',
  'them',
  'thalha',
  'these',
  'this',
  'those',
  'through',
  'tracking',
  'under',
  'very',
  'were',
  'what',
  'when',
  'where',
  'which',
  'while',
  'with',
  'would',
  'year',
  'years',
])

export const GENERIC_WORDS = new Set([
  ...LOW_VALUE_KEYWORDS,
  'new',
  'first',
  'last',
  'next',
  'high',
  'low',
  'top',
  'key',
  'main',
  'large',
  'small',
  'global',
  'local',
  'world',
  'market',
  'markets',
  'industry',
  'sector',
  'update',
  'updates',
  'breaking',
  'analysis',
  'today',
  'yesterday',
  'week',
  'month',
])

const ORGANIZATION_SUFFIX_REGEX =
  /\b(?:Inc|Ltd|Limited|Group|Foundation|Agency|Ministry|University|Company|Corp|Corporation|Labs|Bank|Authority)\b\.?$/i

const ORGANIZATION_NEWS_SUFFIX_REGEX = /\b[A-Za-z0-9][A-Za-z0-9\s&.'-]*\s+News\b$/i

const PERSON_NAME_REGEX = /\b[A-Z][a-z]+(?:['-][A-Z]?[a-z]+)?\s+[A-Z][a-z]+(?:['-][A-Z]?[a-z]+)?\b/g

const TYPE_PRIORITY: Partial<Record<EntityType, number>> = {
  Person: 100,
  Organization: 80,
  Company: 80,
  Country: 75,
  City: 70,
  Technology: 70,
  Product: 65,
  Software: 65,
  Cryptocurrency: 65,
  Stock: 60,
  'Programming Language': 60,
  Keyword: 10,
}

export function isDictionaryEntity(text: string): boolean {
  return DICTIONARY_LOOKUP.has(safeTrim(text).toLowerCase())
}

export function isLowValueKeyword(word: string): boolean {
  const normalized = safeTrim(word).toLowerCase()
  if (!normalized) {
    return true
  }

  if (normalized.length < 5) {
    return !isDictionaryEntity(normalized)
  }

  return LOW_VALUE_KEYWORDS.has(normalized) || GENERIC_WORDS.has(normalized)
}

export function isSourceLikePhrase(phrase: string): boolean {
  const normalized = safeTrim(phrase).toLowerCase()
  if (!normalized) {
    return false
  }

  if (ORGANIZATION_NEWS_SUFFIX_REGEX.test(phrase.trim())) {
    const words = normalized.split(/\s+/)
    if (words.length >= 2 && words.filter((word) => word === 'crypto' || word === 'news').length >= 2) {
      return true
    }
  }

  return /\b(?:news|feed|rss|wire|digest|headlines)\b/i.test(normalized) && normalized.split(/\s+/).length >= 2
}

export function isLikelyPersonName(phrase: string): boolean {
  const trimmed = safeTrim(phrase)
  if (!trimmed || !PERSON_NAME_REGEX.test(trimmed)) {
    return false
  }

  const words = trimmed.split(/\s+/)
  if (words.length !== 2) {
    return false
  }

  for (const word of words) {
    if (word.length < 2) {
      return false
    }

    const lower = word.toLowerCase()
    if (LOW_VALUE_KEYWORDS.has(lower) || GENERIC_WORDS.has(lower)) {
      return false
    }
  }

  if (isSourceLikePhrase(trimmed)) {
    return false
  }

  if (ORGANIZATION_SUFFIX_REGEX.test(trimmed)) {
    return false
  }

  const dictionary = DICTIONARY_LOOKUP.get(trimmed.toLowerCase())
  if (dictionary && dictionary.type !== 'Person') {
    return false
  }

  return true
}

export function isLikelyOrganizationName(phrase: string): boolean {
  const trimmed = safeTrim(phrase)
  if (!trimmed) {
    return false
  }

  if (isLikelyPersonName(trimmed)) {
    return false
  }

  const dictionary = DICTIONARY_LOOKUP.get(trimmed.toLowerCase())
  if (dictionary && (dictionary.type === 'Organization' || dictionary.type === 'Company')) {
    return true
  }

  if (ORGANIZATION_SUFFIX_REGEX.test(trimmed)) {
    return true
  }

  if (ORGANIZATION_NEWS_SUFFIX_REGEX.test(trimmed) && trimmed.split(/\s+/).length >= 2) {
    return !isLikelyPersonName(trimmed)
  }

  return false
}

export function inferEntityTypeForPhrase(phrase: string): EntityType | null {
  if (isLikelyPersonName(phrase)) {
    return 'Person'
  }

  if (isLikelyOrganizationName(phrase)) {
    return 'Organization'
  }

  return null
}

export function shouldKeepKeyword(word: string, protectedTerms: Set<string>): boolean {
  const normalized = safeTrim(word).toLowerCase()
  if (!normalized || normalized.length < 5) {
    return false
  }

  if (isLowValueKeyword(normalized)) {
    return false
  }

  if (protectedTerms.has(normalized)) {
    return false
  }

  for (const term of protectedTerms) {
    if (term.length >= 4 && (term.includes(normalized) || normalized.includes(term))) {
      return false
    }
  }

  return true
}

export function isLowQualityEntity(entity: Entity, protectedTerms: Set<string>): boolean {
  const normalized = entity.normalizedValue.toLowerCase()
  const text = safeTrim(entity.text).toLowerCase()

  if (!normalized) {
    return true
  }

  if (entity.type === 'Keyword') {
    return !shouldKeepKeyword(normalized, protectedTerms)
  }

  if (entity.type === 'Organization' && isLikelyPersonName(entity.normalizedValue)) {
    return true
  }

  if (entity.type === 'Organization' && !isLikelyOrganizationName(entity.normalizedValue)) {
    return !isDictionaryEntity(entity.normalizedValue)
  }

  if (LOW_VALUE_KEYWORDS.has(normalized) || GENERIC_WORDS.has(normalized)) {
    return !isDictionaryEntity(normalized)
  }

  if (isSourceLikePhrase(entity.normalizedValue) && entity.type === 'Organization') {
    return true
  }

  if (
    normalized.split(/\s+/).length === 1 &&
    !isDictionaryEntity(normalized) &&
    entity.type !== 'Person'
  ) {
    const singleWordStructuralTypes: EntityType[] = [
      'Email',
      'Phone Number',
      'Website',
      'Domain',
      'Hashtag',
      'Date',
      'Time',
      'Stock',
      'Cryptocurrency',
      'Currency',
    ]
    if (!singleWordStructuralTypes.includes(entity.type)) {
      return true
    }
  }

  if (text !== normalized && LOW_VALUE_KEYWORDS.has(text)) {
    return true
  }

  return false
}

export function buildProtectedTerms(entities: Entity[]): Set<string> {
  const protectedTerms = new Set<string>()
  const fragmentSourceTypes: EntityType[] = [
    'Person',
    'Organization',
    'Company',
    'Country',
    'City',
    'Technology',
    'Product',
    'Software',
    'Cryptocurrency',
    'Stock',
    'Programming Language',
  ]

  for (const entity of entities) {
    if (entity.type === 'Keyword') {
      continue
    }

    const normalized = entity.normalizedValue.toLowerCase()
    protectedTerms.add(normalized)

    if (!fragmentSourceTypes.includes(entity.type)) {
      continue
    }

    for (const word of normalized.split(/\s+/)) {
      if (word.length >= 3) {
        protectedTerms.add(word)
      }
    }
  }

  return protectedTerms
}

export function resolveEntityConflicts(entities: Entity[]): Entity[] {
  const byNormalized = new Map<string, Entity>()

  for (const entity of entities) {
    const key = entity.normalizedValue.toLowerCase()
    const existing = byNormalized.get(key)

    if (!existing) {
      byNormalized.set(key, entity)
      continue
    }

    const existingPriority = TYPE_PRIORITY[existing.type] ?? 50
    const candidatePriority = TYPE_PRIORITY[entity.type] ?? 50

    if (candidatePriority > existingPriority) {
      byNormalized.set(key, entity)
      continue
    }

    if (candidatePriority === existingPriority && entity.confidence > existing.confidence) {
      byNormalized.set(key, entity)
    }
  }

  return [...byNormalized.values()]
}

export function filterEntityQuality(entities: Entity[]): Entity[] {
  const reclassified = entities.map((entity) => {
    const nextType = reclassifyEntityType(entity.text, entity.type)
    if (nextType === entity.type) {
      return entity
    }

    return { ...entity, type: nextType }
  })

  const resolved = resolveEntityConflicts(reclassified)
  const protectedTerms = buildProtectedTerms(resolved)

  return resolved.filter((entity) => !isLowQualityEntity(entity, protectedTerms))
}

export function reclassifyEntityType(
  entityText: string,
  currentType: EntityType,
): EntityType {
  const inferred = inferEntityTypeForPhrase(entityText)
  if (inferred) {
    return inferred
  }

  const dictionary = DICTIONARY_LOOKUP.get(safeTrim(entityText).toLowerCase())
  if (dictionary) {
    return dictionary.type
  }

  if (currentType === 'Organization' && isLikelyPersonName(entityText)) {
    return 'Person'
  }

  return currentType
}
