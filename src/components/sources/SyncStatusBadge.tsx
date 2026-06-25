import type { ConnectorSyncStatus } from '@/intelligence/types'
import styles from './SyncStatusBadge.module.css'

interface SyncStatusBadgeProps {
  status: ConnectorSyncStatus
}

const LABELS: Record<ConnectorSyncStatus, string> = {
  never: 'Never synced',
  syncing: 'Syncing…',
  completed: 'Completed',
  failed: 'Failed',
}

export function SyncStatusBadge({ status }: SyncStatusBadgeProps) {
  return <span className={`${styles.badge} ${styles[status]}`}>{LABELS[status]}</span>
}
