import type { Source } from '@/types/source'
import {
  formatIntervalLabel,
  formatNextSyncLabel,
} from '@/intelligence/scheduling/scheduleUtils'

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

/** Build sync display metadata from source scheduling fields. */
export function buildPlaceholderSyncState(source: Source): SourceSyncState {
  const isEnabled = source.status === 'enabled' && source.active

  return {
    sourceId: source.id,
    lastSync: source.last_sync_at,
    nextSync: formatNextSyncLabel(source.last_sync_at, source.update_interval),
    health: isEnabled ? 'healthy' : 'degraded',
    errorCount: isEnabled ? 0 : 1,
    itemsCollected: source.items_collected ?? 0,
  }
}

export function formatSourceInterval(source: Source): string {
  return formatIntervalLabel(source.update_interval)
}
