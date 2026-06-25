import type { Source } from '@/types/source'

export interface CollectorContext {
  source: Source
}

export interface ConnectResult {
  success: boolean
  message: string
}

export interface ValidationResult {
  success: boolean
  message: string
}

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'

export interface HealthCheckResult {
  success: boolean
  status: HealthStatus
  message: string
  latencyMs: number
}

export interface RawCollectorItem {
  id: string
  title: string
  url: string
  publishedAt: string
  raw: Record<string, unknown>
}

export interface FetchResult {
  success: boolean
  items: RawCollectorItem[]
  message?: string
}

export interface NormalizedItem {
  title: string
  url: string
  summary: string
  category: string
  publishedAt: string
  sourceType: string
}

export interface CollectorRunResult {
  connect: ConnectResult
  validation: ValidationResult
  fetch: FetchResult
  normalized: NormalizedItem[]
}

export interface ICollector {
  readonly type: string
  connect(context: CollectorContext): Promise<ConnectResult>
  validate(context: CollectorContext): Promise<ValidationResult>
  fetch(context: CollectorContext): Promise<FetchResult>
  normalize(items: RawCollectorItem[], context: CollectorContext): Promise<NormalizedItem[]>
  healthCheck(context: CollectorContext): Promise<HealthCheckResult>
}
