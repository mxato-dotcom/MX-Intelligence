import type { Source } from '@/types/source'

export type SyncHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'

export interface SourceSyncState {
  sourceId: string
  lastSync: string | null
  nextSync: string
  health: SyncHealthStatus
  errorCount: number
  itemsCollected: number
}

export interface SourceSyncActionResult {
  sourceId: string
  action: 'validate' | 'healthCheck'
  success: boolean
  message: string
  timestamp: string
}

/** Placeholder sync metadata until real collector persistence is wired in Phase 6B. */
export function buildPlaceholderSyncState(source: Source): SourceSyncState {
  const isEnabled = source.status === 'enabled' && source.active

  return {
    sourceId: source.id,
    lastSync: source.last_sync_at,
    nextSync: `Every ${source.update_interval} (placeholder)`,
    health: isEnabled ? 'healthy' : 'degraded',
    errorCount: isEnabled ? 0 : 2,
    itemsCollected: source.items_collected ?? 0,
  }
}
