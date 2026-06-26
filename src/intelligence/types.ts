/** Universal normalized intelligence item — shared across all connector types. */
export type { IntelligenceItem } from '@/intelligence/types/IntelligenceItem'

import type { IntelligenceItem } from '@/intelligence/types/IntelligenceItem'

export type ConnectorSyncStatus = 'never' | 'syncing' | 'completed' | 'failed'

export interface ConnectorValidationResult {
  success: boolean
  message: string
}

export type ConnectorHealthStatus = 'healthy' | 'degraded' | 'unhealthy'

export interface ConnectorHealthResult {
  success: boolean
  status: ConnectorHealthStatus
  message: string
  latencyMs: number
}

export interface ConnectorPreviewResult {
  success: boolean
  items: IntelligenceItem[]
  downloaded: number
  error?: string
  durationMs: number
}

export interface ConnectorImportResult {
  downloaded: number
  imported: number
  skipped: number
  updated: number
  failed: number
  durationMs: number
}
