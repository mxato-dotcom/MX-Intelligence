export type SyncJobStatus =
  | 'idle'
  | 'due'
  | 'running'
  | 'completed'
  | 'failed'
  | 'manual'

export interface SyncJob {
  id: string
  sourceId: string
  sourceName: string
  connectorType: string
  status: SyncJobStatus
  lastSyncAt: string | null
  nextSyncAt: string | null
  updateInterval: string
  itemsCollected: number
  errorMessage: string | null
  isDue: boolean
}

export interface SyncJobRunResult {
  success: boolean
  errorMessage?: string
  imported?: number
  skipped?: number
  failed?: number
}

export interface SchedulerStats {
  totalSources: number
  dueNow: number
  running: number
  failed: number
  manualOnly: number
}
