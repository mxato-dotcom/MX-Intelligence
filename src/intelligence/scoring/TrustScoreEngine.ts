import type { ImportEngineResult } from '@/intelligence/import/ImportEngine'
import {
  clampScore,
  formatTrendLabel,
  resolveTrend,
  SCORE_WEIGHTS,
  type ScoreFactorBreakdown,
  type SourceHealthLabel,
  type SourceScoreResult,
  type TrustTrendDirection,
} from '@/intelligence/scoring/ScoreFactors'
import {
  getDuplicateRatio,
  getImportSuccessRate,
  getReliabilityAverage,
  getSourceMetrics,
  initializeManualTrustOverride,
  recordHealthCheck,
  recordImportMetrics,
  setManualTrustOverride,
  setScoreSnapshot,
  type ImportMetricsPayload,
  type SourceRuntimeMetrics,
} from '@/intelligence/scoring/SourceMetrics'
import { parseUpdateInterval } from '@/intelligence/scheduling/scheduleUtils'
import * as sourceService from '@/services/sourceService'
import type { Source } from '@/types/source'

export interface TrustDashboardStats {
  averageTrust: number
  highestTrustSource: string | null
  highestTrustScore: number
  lowestTrustSource: string | null
  lowestTrustScore: number
  healthySources: number
  warningSources: number
  offlineSources: number
}

export interface ConnectorTrustSummary {
  connectorType: string
  averageTrust: number
  sourceCount: number
}

function scoreFreshness(source: Source): number {
  if (!source.last_sync_at) {
    return 20
  }

  const lastSync = new Date(source.last_sync_at)
  if (Number.isNaN(lastSync.getTime())) {
    return 20
  }

  const parsed = parseUpdateInterval(source.update_interval)
  const intervalMs = parsed && parsed.kind !== 'manual' ? parsed.minutes * 60 * 1000 : 24 * 60 * 60 * 1000
  const ageMs = Date.now() - lastSync.getTime()
  const ratio = ageMs / intervalMs

  if (ratio <= 1) {
    return 100
  }
  if (ratio <= 2) {
    return 70
  }
  if (ratio <= 4) {
    return 45
  }
  return 15
}

function scoreDuplicateQuality(metrics: SourceRuntimeMetrics): number {
  const ratio = getDuplicateRatio(metrics)
  return clampScore((1 - ratio) * 100)
}

function scoreHealthComponent(metrics: SourceRuntimeMetrics): number {
  if (!metrics.lastHealthCheckSuccess) {
    return 25
  }

  if (metrics.recentFailureStreak >= 3) {
    return 20
  }
  if (metrics.recentFailureStreak === 2) {
    return 50
  }
  if (metrics.recentFailureStreak === 1) {
    return 70
  }
  return 100
}

function resolveHealthLabel(
  score: number,
  source: Source,
  metrics: SourceRuntimeMetrics,
): SourceHealthLabel {
  if (!source.active || source.status === 'disabled') {
    return 'Offline'
  }

  if (metrics.recentFailureStreak >= 4 || score < 20) {
    return 'Offline'
  }

  if (score >= 90) {
    return 'Excellent'
  }
  if (score >= 75) {
    return 'Healthy'
  }
  if (score >= 50) {
    return 'Warning'
  }
  return 'Poor'
}

function deriveSourceStatus(source: Source, health: SourceHealthLabel): string {
  if (health === 'Offline' && metricsIndicatesPersistentFailure(getSourceMetrics(source.id))) {
    return 'disabled'
  }

  if (!source.active) {
    return source.status
  }

  return 'enabled'
}

function metricsIndicatesPersistentFailure(metrics: SourceRuntimeMetrics): boolean {
  return metrics.recentFailureStreak >= 3 || metrics.failedImports > metrics.successfulImports
}

export class TrustScoreEngine {
  updateMetrics(sourceId: string, payload: ImportMetricsPayload): SourceRuntimeMetrics {
    return recordImportMetrics(sourceId, payload)
  }

  recordHealthCheck(sourceId: string, success: boolean): SourceRuntimeMetrics {
    return recordHealthCheck(sourceId, success)
  }

  setManualOverride(sourceId: string, manualTrust: number): void {
    setManualTrustOverride(sourceId, manualTrust)
  }

  calculateSourceScore(source: Source): SourceScoreResult {
    const metrics = getSourceMetrics(source.id)
    initializeManualTrustOverride(source.id, source.trust_score)

    const manualTrust = metrics.manualTrustOverride ?? source.trust_score

    const factors: ScoreFactorBreakdown = {
      importSuccessRate: getImportSuccessRate(metrics),
      healthStatus: scoreHealthComponent(metrics),
      duplicateRatio: scoreDuplicateQuality(metrics),
      sourceFreshness: scoreFreshness(source),
      reliabilityHistory: getReliabilityAverage(metrics),
      manualTrustBonus: clampScore(manualTrust),
    }

    const weightedScore =
      factors.importSuccessRate * SCORE_WEIGHTS.importSuccessRate +
      factors.healthStatus * SCORE_WEIGHTS.healthStatus +
      factors.duplicateRatio * SCORE_WEIGHTS.duplicateRatio +
      factors.sourceFreshness * SCORE_WEIGHTS.sourceFreshness +
      factors.reliabilityHistory * SCORE_WEIGHTS.reliabilityHistory +
      factors.manualTrustBonus * SCORE_WEIGHTS.manualTrustBonus

    const score = clampScore(weightedScore)
    const health = this.calculateHealth(source, score, metrics)
    const { trend, trendDelta } = resolveTrend(score, metrics.previousScore)

    return { score, factors, health, trend, trendDelta }
  }

  calculateHealth(
    source: Source,
    score: number,
    metrics?: SourceRuntimeMetrics,
  ): SourceHealthLabel {
    const runtimeMetrics = metrics ?? getSourceMetrics(source.id)
    return resolveHealthLabel(score, source, runtimeMetrics)
  }

  async recordFailedSync(source: Source): Promise<SourceScoreResult> {
    this.updateMetrics(source.id, {
      downloaded: 0,
      result: { imported: 0, skipped: 0, updated: 0, failed: 1 },
      connectorHealthy: false,
    })

    return this.applyScoreToSource(source)
  }

  async applyScoreToSource(source: Source): Promise<SourceScoreResult> {
    const result = this.calculateSourceScore(source)
    setScoreSnapshot(source.id, result.score)

    const status = deriveSourceStatus(source, result.health)

    await sourceService.updateSourceScoringFields(source.id, result.score, status)

    return result
  }

  async recordImportAndRecalculate(
    source: Source,
    downloaded: number,
    importResult: ImportEngineResult,
    connectorHealthy = true,
  ): Promise<SourceScoreResult> {
    this.updateMetrics(source.id, {
      downloaded,
      result: importResult,
      connectorHealthy,
    })

    const refreshed = await sourceService.getSourceById(source.id)
    const latestSource = refreshed ?? source

    return this.applyScoreToSource(latestSource)
  }

  computeDashboardStats(sources: Source[]): TrustDashboardStats {
    if (sources.length === 0) {
      return {
        averageTrust: 0,
        highestTrustSource: null,
        highestTrustScore: 0,
        lowestTrustSource: null,
        lowestTrustScore: 0,
        healthySources: 0,
        warningSources: 0,
        offlineSources: 0,
      }
    }

    const scored = sources.map((source) => ({
      source,
      profile: this.calculateSourceScore(source),
    }))

    const averageTrust = Math.round(
      scored.reduce((sum, entry) => sum + entry.profile.score, 0) / scored.length,
    )

    const sorted = [...scored].sort((left, right) => right.profile.score - left.profile.score)
    const highest = sorted[0]
    const lowest = sorted[sorted.length - 1]

    return {
      averageTrust,
      highestTrustSource: highest.source.name,
      highestTrustScore: highest.profile.score,
      lowestTrustSource: lowest.source.name,
      lowestTrustScore: lowest.profile.score,
      healthySources: scored.filter(
        (entry) => entry.profile.health === 'Excellent' || entry.profile.health === 'Healthy',
      ).length,
      warningSources: scored.filter((entry) => entry.profile.health === 'Warning' || entry.profile.health === 'Poor').length,
      offlineSources: scored.filter((entry) => entry.profile.health === 'Offline').length,
    }
  }

  computeConnectorTrustSummaries(sources: Source[]): ConnectorTrustSummary[] {
    const groups = new Map<string, Source[]>()

    for (const source of sources) {
      const list = groups.get(source.source_type) ?? []
      list.push(source)
      groups.set(source.source_type, list)
    }

    return [...groups.entries()].map(([connectorType, group]) => {
      const scores = group.map((source) => this.calculateSourceScore(source).score)
      const averageTrust =
        scores.length === 0 ? 0 : Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)

      return {
        connectorType,
        averageTrust,
        sourceCount: group.length,
      }
    })
  }
}

export const trustScoreEngine = new TrustScoreEngine()

export { formatTrendLabel, type TrustTrendDirection, type SourceHealthLabel, type SourceScoreResult }
