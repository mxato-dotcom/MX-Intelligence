import type { IntelligenceCluster } from '@/intelligence/fusion/FusionCluster'
import type { BriefRiskLevel } from '@/intelligence/brief/BriefTypes'
import { clampScore } from '@/intelligence/scoring/ScoreFactors'

export function calculateSectionConfidence(input: {
  articleCount: number
  clusterCount: number
  averageClusterConfidence: number
}): number {
  const articleScore = Math.min(100, input.articleCount * 15)
  const clusterScore = Math.min(100, input.clusterCount * 20)
  const weighted =
    articleScore * 0.35 + clusterScore * 0.25 + input.averageClusterConfidence * 0.4

  return clampScore(weighted)
}

export function calculateImportanceScore(input: {
  articleCount: number
  clusterCount: number
  entityCount: number
  averageClusterConfidence: number
  confirmedClusterCount: number
}): number {
  const articleScore = Math.min(100, input.articleCount * 8)
  const clusterScore = Math.min(100, input.clusterCount * 12)
  const entityScore = Math.min(100, input.entityCount * 2)
  const confirmedScore = Math.min(100, input.confirmedClusterCount * 25)

  const weighted =
    articleScore * 0.25 +
    clusterScore * 0.25 +
    entityScore * 0.15 +
    confirmedScore * 0.15 +
    input.averageClusterConfidence * 0.2

  return clampScore(weighted)
}

export function calculateRiskLevel(
  clusters: IntelligenceCluster[],
  conflictingReports: number,
): BriefRiskLevel {
  if (clusters.length === 0) {
    return 'Low'
  }

  const conflicting = clusters.filter((cluster) => cluster.agreement === 'Conflicting').length
  const offlineRatio = clusters.filter((cluster) => cluster.confidenceScore < 40).length / clusters.length
  const lowTrustRatio =
    clusters.filter((cluster) => cluster.averageTrustScore < 50).length / clusters.length

  const conflictScore = conflicting + conflictingReports
  const riskPoints =
    conflictScore * 25 + offlineRatio * 100 * 0.35 + lowTrustRatio * 100 * 0.25

  if (riskPoints >= 80) {
    return 'Critical'
  }
  if (riskPoints >= 60) {
    return 'High'
  }
  if (riskPoints >= 40) {
    return 'Elevated'
  }
  if (riskPoints >= 20) {
    return 'Moderate'
  }

  return 'Low'
}

export function calculateOverallConfidence(input: {
  importanceScore: number
  averageSectionConfidence: number
  averageClusterConfidence: number
}): number {
  return clampScore(
    input.importanceScore * 0.35 +
      input.averageSectionConfidence * 0.35 +
      input.averageClusterConfidence * 0.3,
  )
}

export function riskLevelClass(risk: BriefRiskLevel): string {
  switch (risk) {
    case 'Critical':
      return 'critical'
    case 'High':
      return 'high'
    case 'Elevated':
      return 'elevated'
    case 'Moderate':
      return 'moderate'
    default:
      return 'low'
  }
}
