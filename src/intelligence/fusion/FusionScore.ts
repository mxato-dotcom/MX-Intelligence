import type { SourceAgreement } from '@/intelligence/fusion/FusionCluster'
import { jaccardSimilarity } from '@/intelligence/fusion/TopicExtractor'

export const CONFIDENCE_WEIGHTS = {
  sourceCount: 0.25,
  averageTrust: 0.25,
  freshness: 0.2,
  agreement: 0.15,
  duplicateConfidence: 0.15,
} as const

export const AGREEMENT_SCORES: Record<SourceAgreement, number> = {
  Confirmed: 100,
  Likely: 75,
  'Single Source': 50,
  Conflicting: 25,
}

const TRUSTED_SOURCE_THRESHOLD = 70
const HIGH_TRUST_THRESHOLD = 80
const CONFLICTING_TITLE_THRESHOLD = 0.35

export interface ArticleFusionProfile {
  articleId: string
  normalizedTitle: string
  titleWords: Set<string>
  keywords: Set<string>
  category: string
  publishedAtMs: number
  sourceName: string
  trustScore: number
}

export function clampConfidence(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function scoreTimeProximity(leftMs: number, rightMs: number): number {
  const diffHours = Math.abs(leftMs - rightMs) / (60 * 60 * 1000)

  if (diffHours <= 24) {
    return 100
  }
  if (diffHours <= 48) {
    return 80
  }
  if (diffHours <= 72) {
    return 60
  }
  if (diffHours <= 168) {
    return 30
  }

  return 0
}

export function computeSemanticSimilarity(left: ArticleFusionProfile, right: ArticleFusionProfile): number {
  const titleSimilarity = jaccardSimilarity(left.titleWords, right.titleWords) * 100
  const keywordSimilarity = jaccardSimilarity(left.keywords, right.keywords) * 100
  const categoryScore = left.category === right.category && left.category.length > 0 ? 100 : 0
  const timeScore = scoreTimeProximity(left.publishedAtMs, right.publishedAtMs)

  return (
    titleSimilarity * 0.4 +
    keywordSimilarity * 0.3 +
    categoryScore * 0.15 +
    timeScore * 0.15
  )
}

export function computeDuplicateConfidence(profiles: ArticleFusionProfile[]): number {
  if (profiles.length <= 1) {
    return 50
  }

  let pairCount = 0
  let similaritySum = 0

  for (let index = 0; index < profiles.length; index += 1) {
    for (let other = index + 1; other < profiles.length; other += 1) {
      pairCount += 1
      similaritySum += jaccardSimilarity(profiles[index].titleWords, profiles[other].titleWords) * 100
    }
  }

  return pairCount === 0 ? 50 : similaritySum / pairCount
}

export function scoreFreshness(latestUpdateMs: number): number {
  const ageHours = (Date.now() - latestUpdateMs) / (60 * 60 * 1000)

  if (ageHours <= 12) {
    return 100
  }
  if (ageHours <= 24) {
    return 90
  }
  if (ageHours <= 72) {
    return 75
  }
  if (ageHours <= 168) {
    return 55
  }
  if (ageHours <= 336) {
    return 35
  }

  return 15
}

export function scoreSourceCount(uniqueSourceCount: number): number {
  if (uniqueSourceCount >= 4) {
    return 100
  }
  if (uniqueSourceCount === 3) {
    return 85
  }
  if (uniqueSourceCount === 2) {
    return 70
  }

  return 40
}

export function determineAgreement(
  profiles: ArticleFusionProfile[],
  duplicateConfidence: number,
): SourceAgreement {
  const uniqueSources = new Set(profiles.map((profile) => profile.sourceName))

  if (uniqueSources.size <= 1) {
    return 'Single Source'
  }

  const averageTrust =
    profiles.reduce((sum, profile) => sum + profile.trustScore, 0) / profiles.length

  const hasConflictingTitles = profiles.some((left, index) =>
    profiles.slice(index + 1).some((right) => {
      if (left.sourceName === right.sourceName) {
        return false
      }

      return jaccardSimilarity(left.titleWords, right.titleWords) < CONFLICTING_TITLE_THRESHOLD
    }),
  )

  if (hasConflictingTitles) {
    return 'Conflicting'
  }

  const trustedSourceCount = [...uniqueSources].filter((sourceName) => {
    const sourceProfiles = profiles.filter((profile) => profile.sourceName === sourceName)
    const peakTrust = Math.max(...sourceProfiles.map((profile) => profile.trustScore))
    return peakTrust >= TRUSTED_SOURCE_THRESHOLD
  }).length

  if (trustedSourceCount >= 2 && duplicateConfidence >= 55) {
    return 'Confirmed'
  }

  if (trustedSourceCount >= 2 || averageTrust >= HIGH_TRUST_THRESHOLD) {
    return 'Likely'
  }

  return 'Likely'
}

export function calculateConfidenceScore(input: {
  uniqueSourceCount: number
  averageTrust: number
  latestUpdateMs: number
  agreement: SourceAgreement
  duplicateConfidence: number
}): number {
  const weighted =
    scoreSourceCount(input.uniqueSourceCount) * CONFIDENCE_WEIGHTS.sourceCount +
    clampConfidence(input.averageTrust) * CONFIDENCE_WEIGHTS.averageTrust +
    scoreFreshness(input.latestUpdateMs) * CONFIDENCE_WEIGHTS.freshness +
    AGREEMENT_SCORES[input.agreement] * CONFIDENCE_WEIGHTS.agreement +
    clampConfidence(input.duplicateConfidence) * CONFIDENCE_WEIGHTS.duplicateConfidence

  return clampConfidence(weighted)
}
