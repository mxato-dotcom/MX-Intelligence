import { SourceFeedActions } from '@/components/sources/SourceFeedActions'
import { SyncStatusBadge } from '@/components/sources/SyncStatusBadge'
import type { ConnectorSyncStatus } from '@/intelligence/types'
import { formatDate } from '@/lib/format'
import type { Source } from '@/types/source'
import styles from './SourceConnectorPanel.module.css'

interface SourceConnectorPanelProps {
  source: Source
  onSyncComplete?: () => void
}

function resolveSyncStatus(source: Source): ConnectorSyncStatus {
  if (source.last_sync_at) {
    return 'completed'
  }
  return 'never'
}

export function SourceConnectorPanel({ source, onSyncComplete }: SourceConnectorPanelProps) {
  return (
    <section className={styles.connector}>
      <div className={styles.connectorHeader}>
        <h3 className={styles.connectorTitle}>Intelligence connector</h3>
        <SyncStatusBadge status={resolveSyncStatus(source)} />
      </div>

      <div className={styles.syncRow}>
        <span>
          Last sync:{' '}
          {source.last_sync_at ? formatDate(source.last_sync_at) : 'Never synced'}
        </span>
        <span>Items collected: {source.items_collected ?? 0}</span>
        <span>Status: {source.status}</span>
      </div>

      <SourceFeedActions source={source} onSourceUpdated={onSyncComplete} />
    </section>
  )
}
