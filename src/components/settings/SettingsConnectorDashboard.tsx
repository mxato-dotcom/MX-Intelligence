import { ConnectorHealthCard } from '@/components/settings/ConnectorHealthCard'
import type { ConnectorHealthRecord, ConnectorId } from '@/types/connectorSettings'
import { getConnectorProvider } from '@/types/connectorSettings'
import styles from './SettingsConnectorDashboard.module.css'

interface SettingsConnectorDashboardProps {
  healthRecords: ConnectorHealthRecord[]
  isLoading?: boolean
  onConfigure: (settingsPath: string) => void
  onTestComplete: () => void
  onRefresh: () => void
  onSyncNow?: (connectorId: ConnectorId) => void
  syncingConnector?: string | null
}

export function SettingsConnectorDashboard({
  healthRecords,
  isLoading = false,
  onConfigure,
  onTestComplete,
  onRefresh,
  onSyncNow,
  syncingConnector,
}: SettingsConnectorDashboardProps) {
  return (
    <section className={styles.section} aria-labelledby="connector-dashboard-title">
      <div className={styles.header}>
        <div>
          <h2 id="connector-dashboard-title" className={styles.title}>
            Connector Dashboard
          </h2>
          <p className={styles.subtitle}>
            Real-time health and sync metrics for every intelligence connector.
          </p>
        </div>
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={onRefresh}
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing…' : 'Refresh All'}
        </button>
      </div>
      <div className={styles.grid}>
        {healthRecords.map((health) => (
          <ConnectorHealthCard
            key={health.connectorId}
            health={health}
            compact
            onConfigure={() =>
              onConfigure(getConnectorProvider(health.connectorId).settingsPath)
            }
            onTestComplete={onTestComplete}
            onSyncNow={onSyncNow ? () => onSyncNow(health.connectorId) : undefined}
            isSyncing={syncingConnector === health.connectorId}
          />
        ))}
      </div>
    </section>
  )
}
