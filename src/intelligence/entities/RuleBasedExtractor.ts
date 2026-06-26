import { DICTIONARY_LOOKUP } from '@/intelligence/entities/dictionaries'
import type { ExtractionResult } from '@/intelligence/entities/ExtractionResult'
import { createEmptyExtractionResult } from '@/intelligence/entities/ExtractionResult'
import { EntityRegistry, normalizeEntityValue } from '@/intelligence/entities/EntityRegistry'
import type { EntityType } from '@/intelligence/entities/EntityType'
import type { Article } from '@/types/article'
import type { IntelligenceItem } from '@/intelligence/types/IntelligenceItem'
import { safeString, safeTrim } from '@/lib/safeString'

const CONFIDENCE_REGEX = 100
const CONFIDENCE_DICTIONARY = 95
const CONFIDENCE_HEURISTIC = 70

const PATTERNS: Array<{
  type: EntityType
  regex: RegExp
  normalize?: (match: string) => string
}> = [
  {
    type: 'Email',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  },
  {
    type: 'Phone Number',
    regex: /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}\b/g,
  },
  {
    type: 'Website',
    regex: /https?:\/\/[^\s<>"']+/gi,
    normalize: (match) => match.replace(/[.,;]+$/, ''),
  },
  {
    type: 'Domain',
    regex: /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/gi,
  },
  {
    type: 'Hashtag',
    regex: /#[A-Za-z0-9_]+/g,
  },
  {
    type: 'Date',
    regex:
      /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b/gi,
  },
  {
    type: 'Time',
    regex: /\b(?:[01]?\d|2[0-3]):[0-5]\d(?:\s?[AP]M)?\b/gi,
  },
  {
    type: 'Stock',
    regex: /\$[A-Z]{1,5}\b/g,
    normalize: (match) => match.replace('$', '').toUpperCase(),
  },
  {
    type: 'Cryptocurrency',
    regex: /\b(?:BTC|ETH|SOL|DOGE|XRP|ADA|USDT|USDC)\b/g,
    normalize: (match) => match.toUpperCase(),
  },
  {
    type: 'Currency',
    regex: /\b(?:USD|EUR|GBP|JPY|CNY|CHF|CAD|AUD)\b/gi,
    normalize: (match) => match.toUpperCase(),
  },
]

const CAPITALIZED_PHRASE_REGEX = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g

export interface EntityExtractorProvider {
  extractFromText(text: string): ExtractionResult
  extractFromArticle(article: Article): ExtractionResult
  extractFromIntelligenceItem(item: IntelligenceItem): ExtractionResult
}

function addRegexMatches(registry: EntityRegistry, text: string, pattern: typeof PATTERNS[number]): void {
  pattern.regex.lastIndex = 0
  let match = pattern.regex.exec(text)

  while (match) {
    const raw = match[0]
    const position = match.index
    const normalized = pattern.normalize ? pattern.normalize(raw) : raw.trim()
    registry.register({
      type: pattern.type,
      text: raw,
      normalizedValue: normalizeEntityValue(normalized),
      confidence: CONFIDENCE_REGEX,
      position,
    })
    match = pattern.regex.exec(text)
  }
}

function addDictionaryMatches(registry: EntityRegistry, text: string): void {
  const lowerText = text.toLowerCase()

  for (const [alias, entry] of DICTIONARY_LOOKUP.entries()) {
    const pattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    let match = pattern.exec(lowerText)

    while (match) {
      registry.register({
        type: entry.type,
        text: text.slice(match.index, match.index + match[0].length),
        normalizedValue: entry.canonical,
        confidence: CONFIDENCE_DICTIONARY,
        position: match.index,
      })
      match = pattern.exec(lowerText)
    }
  }
}

function addCapitalizedHeuristics(registry: EntityRegistry, text: string): void {
  CAPITALIZED_PHRASE_REGEX.lastIndex = 0
  let match = CAPITALIZED_PHRASE_REGEX.exec(text)

  while (match) {
    const phrase = match[0]
    const lower = phrase.toLowerCase()
    if (DICTIONARY_LOOKUP.has(lower)) {
      match = CAPITALIZED_PHRASE_REGEX.exec(text)
      continue
    }

    const type: EntityType =
      phrase.split(' ').length >= 2 ? 'Organization' : 'Person'

    registry.register({
      type,
      text: phrase,
      normalizedValue: normalizeEntityValue(phrase),
      confidence: CONFIDENCE_HEURISTIC,
      position: match.index,
    })
    match = CAPITALIZED_PHRASE_REGEX.exec(text)
  }
}

function addKeywordEntities(registry: EntityRegistry, text: string): void {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s#@]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 4)

  const counts = new Map<string, number>()
  for (const word of words) {
    if (DICTIONARY_LOOKUP.has(word)) {
      continue
    }
    counts.set(word, (counts.get(word) ?? 0) + 1)
  }

  const topKeywords = [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)

  for (const [word, count] of topKeywords) {
    if (count < 2) {
      continue
    }

    const index = text.toLowerCase().indexOf(word)
    registry.register({
      type: 'Keyword',
      text: word,
      normalizedValue: normalizeEntityValue(word),
      confidence: CONFIDENCE_HEURISTIC,
      position: index >= 0 ? index : 0,
    })
  }
}

function extractWithRegistry(text: string): ExtractionResult {
  const trimmed = safeTrim(text)
  if (!trimmed) {
    return createEmptyExtractionResult()
  }

  const registry = new EntityRegistry()

  for (const pattern of PATTERNS) {
    addRegexMatches(registry, trimmed, pattern)
  }

  addDictionaryMatches(registry, trimmed)
  addCapitalizedHeuristics(registry, trimmed)
  addKeywordEntities(registry, trimmed)

  return {
    entities: registry.getEntities(),
    sourceTextLength: trimmed.length,
    extractedAt: new Date().toISOString(),
  }
}

export class RuleBasedExtractor implements EntityExtractorProvider {
  extractFromText(text: string): ExtractionResult {
    return extractWithRegistry(text)
  }

  extractFromArticle(article: Article): ExtractionResult {
    const combined = [
      safeString(article.title),
      safeString(article.summary),
      safeString(article.content),
      safeString(article.category),
      safeString(article.source),
    ].join('\n')

    return extractWithRegistry(combined)
  }

  extractFromIntelligenceItem(item: IntelligenceItem): ExtractionResult {
    const combined = [
      safeString(item.title),
      safeString(item.summary),
      safeString(item.content),
      safeString(item.category),
      safeString(item.sourceName),
      safeString(item.url),
      item.tags.join(' '),
    ].join('\n')

    return extractWithRegistry(combined)
  }
}

export const ruleBasedExtractor = new RuleBasedExtractor()
