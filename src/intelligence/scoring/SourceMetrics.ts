import type { ImportEngineResult } from '@/intelligence/import/ImportEngine'

export interface ImportMetricsPayload {
  downloaded: number
  result: ImportEngineResult
  connectorHealthy?: boolean
}

export interface SourceRuntimeMetrics {
  sourceId: string
  successfulImports: number
  failedImports: number
  totalImported: number
  totalSkipped: number
  totalUpdated: number
  totalFailed: number
  totalDownloaded: number
  lastSuccessfulSync: string | null
  lastFailedSync: string | null
  recentFailureStreak: number
  manualTrustOverride: number | null
  previousScore: number | null
  currentScore: number | null
  reliabilityHistory: number[]
  lastHealthCheckSuccess: boolean
}

const metricsStore = new Map<string, SourceRuntimeMetrics>()
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) {
    listener()
  }
}

export function subscribeSourceMetrics(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSourceMetrics(sourceId: string): SourceRuntimeMetrics {
  const existing = metricsStore.get(sourceId)
  if (existing) {
    return existing
  }

  const initial: SourceRuntimeMetrics = {
    sourceId,
    successfulImports: 0,
    failedImports: 0,
    totalImported: 0,
    totalSkipped: 0,
    totalUpdated: 0,
    totalFailed: 0,
    totalDownloaded: 0,
    lastSuccessfulSync: null,
    lastFailedSync: null,
    recentFailureStreak: 0,
    manualTrustOverride: null,
    previousScore: null,
    currentScore: null,
    reliabilityHistory: [],
    lastHealthCheckSuccess: true,
  }

  metricsStore.set(sourceId, initial)
  return initial
}

export function setManualTrustOverride(sourceId: string, value: number): SourceRuntimeMetrics {
  const metrics = getSourceMetrics(sourceId)
  metrics.manualTrustOverride = clampManualTrust(value)
  metricsStore.set(sourceId, metrics)
  notify()
  return metrics
}

export function initializeManualTrustOverride(
  sourceId: string,
  manualTrust: number,
): SourceRuntimeMetrics {
  const metrics = getSourceMetrics(sourceId)
  if (metrics.manualTrustOverride === null) {
    metrics.manualTrustOverride = clampManualTrust(manualTrust)
    metricsStore.set(sourceId, metrics)
  }
  return metrics
}

export function recordHealthCheck(sourceId: string, success: boolean): SourceRuntimeMetrics {
  const metrics = getSourceMetrics(sourceId)
  metrics.lastHealthCheckSuccess = success
  metricsStore.set(sourceId, metrics)
  notify()
  return metrics
}

export function recordImportMetrics(
  sourceId: string,
  payload: ImportMetricsPayload,
): SourceRuntimeMetrics {
  const metrics = getSourceMetrics(sourceId)
  const { downloaded, result, connectorHealthy = true } = payload
  const processed = result.imported + result.skipped + result.updated + result.failed
  const importSucceeded = result.failed === 0 && (result.imported > 0 || result.updated > 0 || result.skipped > 0)
  const completeFailure = processed > 0 && result.imported === 0 && result.updated === 0 && result.failed > 0

  metrics.totalDownloaded += downloaded
  metrics.totalImported += result.imported
  metrics.totalSkipped += result.skipped
  metrics.totalUpdated += result.updated
  metrics.totalFailed += result.failed

  if (importSucceeded) {
    metrics.successfulImports += 1
    metrics.lastSuccessfulSync = new Date().toISOString()
    metrics.recentFailureStreak = 0
  }

  if (completeFailure) {
    metrics.failedImports += 1
    metrics.lastFailedSync = new Date().toISOString()
    metrics.recentFailureStreak += 1
  }

  const attemptSuccessRate =
    processed === 0 ? 100 : ((result.imported + result.updated) / processed) * 100

  metrics.reliabilityHistory.push(attemptSuccessRate)
  if (metrics.reliabilityHistory.length > 20) {
    metrics.reliabilityHistory.shift()
  }

  metrics.lastHealthCheckSuccess = connectorHealthy
  metricsStore.set(sourceId, metrics)
  notify()
  return metrics
}

export function setScoreSnapshot(
  sourceId: string,
  score: number,
): SourceRuntimeMetrics {
  const metrics = getSourceMetrics(sourceId)
  metrics.previousScore = metrics.currentScore ?? score
  metrics.currentScore = score
  metricsStore.set(sourceId, metrics)
  notify()
  return metrics
}

export function getAllSourceMetrics(): SourceRuntimeMetrics[] {
  return [...metricsStore.values()]
}

function clampManualTrust(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function getAverageArticlesPerImport(metrics: SourceRuntimeMetrics): number {
  if (metrics.successfulImports === 0) {
    return 0
  }
  return metrics.totalImported / metrics.successfulImports
}

export function getDuplicateRatio(metrics: SourceRuntimeMetrics): number {
  const processed = metrics.totalImported + metrics.totalSkipped + metrics.totalUpdated + metrics.totalFailed
  if (processed === 0) {
    return 0
  }
  return metrics.totalSkipped / processed
}

export function getImportSuccessRate(metrics: SourceRuntimeMetrics): number {
  const attempts = metrics.successfulImports + metrics.failedImports
  if (attempts === 0) {
    return 100
  }
  return (metrics.successfulImports / attempts) * 100
}

export function getReliabilityAverage(metrics: SourceRuntimeMetrics): number {
  if (metrics.reliabilityHistory.length === 0) {
    return metrics.lastHealthCheckSuccess ? 80 : 50
  }

  const sum = metrics.reliabilityHistory.reduce((total, value) => total + value, 0)
  return sum / metrics.reliabilityHistory.length
}
