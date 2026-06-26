import { buildNormalizedTitle, normalizeText } from '@/intelligence/duplicate/Fingerprint'
import type { Article } from '@/types/article'

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'as',
  'is',
  'was',
  'are',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'must',
  'shall',
  'can',
  'this',
  'that',
  'these',
  'those',
  'it',
  'its',
  'they',
  'their',
  'them',
  'we',
  'our',
  'you',
  'your',
  'he',
  'she',
  'his',
  'her',
  'about',
  'into',
  'over',
  'after',
  'before',
  'between',
  'under',
  'again',
  'further',
  'then',
  'once',
  'here',
  'there',
  'when',
  'where',
  'why',
  'how',
  'all',
  'each',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'nor',
  'not',
  'only',
  'own',
  'same',
  'so',
  'than',
  'too',
  'very',
  'just',
  'also',
  'now',
  'new',
  'says',
  'said',
  'report',
  'reports',
  'according',
])

export function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(' ')
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
}

export function extractKeywords(text: string, limit = 8): string[] {
  const counts = new Map<string, number>()

  for (const token of tokenize(text)) {
    counts.set(token, (counts.get(token) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([word]) => word)
}

export function extractArticleKeywords(article: Article): string[] {
  const weightedTokens = new Map<string, number>()

  const addTokens = (text: string, weight: number) => {
    for (const token of tokenize(text)) {
      weightedTokens.set(token, (weightedTokens.get(token) ?? 0) + weight)
    }
  }

  addTokens(article.title, 3)
  addTokens(article.summary, 2)
  addTokens(article.content.slice(0, 500), 1)

  return [...weightedTokens.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 10)
    .map(([word]) => word)
}

export function extractClusterKeywords(articles: Article[]): string[] {
  const aggregate = new Map<string, number>()

  for (const article of articles) {
    for (const keyword of extractArticleKeywords(article)) {
      aggregate.set(keyword, (aggregate.get(keyword) ?? 0) + 1)
    }
  }

  return [...aggregate.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 8)
    .map(([word]) => word)
}

export function buildTitleWordSet(title: string): Set<string> {
  return new Set(tokenize(buildNormalizedTitle(title)))
}

export function jaccardSimilarity(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 && right.size === 0) {
    return 0
  }

  let intersection = 0
  for (const value of left) {
    if (right.has(value)) {
      intersection += 1
    }
  }

  const union = left.size + right.size - intersection
  if (union === 0) {
    return 0
  }

  return intersection / union
}
