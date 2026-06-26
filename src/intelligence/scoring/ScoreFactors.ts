export const SCORE_WEIGHTS = {
  importSuccessRate: 0.3,
  healthStatus: 0.2,
  duplicateRatio: 0.15,
  sourceFreshness: 0.15,
  reliabilityHistory: 0.1,
  manualTrustBonus: 0.1,
} as const

export type SourceHealthLabel =
  | 'Excellent'
  | 'Healthy'
  | 'Warning'
  | 'Poor'
  | 'Offline'

export type TrustTrendDirection = 'up' | 'down' | 'flat'

export interface ScoreFactorBreakdown {
  importSuccessRate: number
  healthStatus: number
  duplicateRatio: number
  sourceFreshness: number
  reliabilityHistory: number
  manualTrustBonus: number
}

export interface SourceScoreResult {
  score: number
  factors: ScoreFactorBreakdown
  health: SourceHealthLabel
  trend: TrustTrendDirection
  trendDelta: number
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function resolveTrend(current: number, previous: number | null): {
  trend: TrustTrendDirection
  trendDelta: number
} {
  if (previous === null) {
    return { trend: 'flat', trendDelta: 0 }
  }

  const delta = current - previous
  if (delta > 0) {
    return { trend: 'up', trendDelta: delta }
  }
  if (delta < 0) {
    return { trend: 'down', trendDelta: delta }
  }
  return { trend: 'flat', trendDelta: 0 }
}

export function formatTrendLabel(trend: TrustTrendDirection, delta: number): string {
  if (trend === 'up') {
    return `↑ +${delta}`
  }
  if (trend === 'down') {
    return `↓ ${delta}`
  }
  return '→ 0'
}
