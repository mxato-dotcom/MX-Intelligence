import { Link } from 'react-router-dom'
import { ConnectionTestButton } from '@/components/settings/ConnectionTestButton'
import { ConnectorLogo } from '@/components/settings/ConnectorLogo'
import { computeHealthPercent } from '@/components/settings/HealthIndicator'
import { HealthRing } from '@/components/settings/HealthRing'
import { StatusBadge } from '@/components/settings/StatusBadge'
import { ROUTES } from '@/lib/constants'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
import type { ConnectorHealthRecord } from '@/types/connectorSettings'
import { getConnectorProvider } from '@/types/connectorSettings'
import styles from './ConnectorHealthCard.module.css'

interface ConnectorHealthCardProps {
  health: ConnectorHealthRecord
  onConfigure?: () => void
  onTestComplete?: () => void
  onSyncNow?: () => void
  isSyncing?: boolean
  compact?: boolean
}

function credentialLabel(status: ConnectorHealthRecord['credentialStatus']): string {
  switch (status) {
    case 'configured':
      return 'Stored securely'
    case 'partial':
      return 'Configuration incomplete'
    default:
      return 'Not configured'
  }
}

function credentialVariant(
  status: ConnectorHealthRecord['credentialStatus'],
): 'green' | 'amber' | 'red' {
  switch (status) {
    case 'configured':
      return 'green'
    case 'partial':
      return 'amber'
    default:
      return 'red'
  }
}

export function ConnectorHealthCard({
  health,
  onConfigure,
  onTestComplete,
  onSyncNow,
  isSyncing = false,
  compact = false,
}: ConnectorHealthCardProps) {
  const provider = getConnectorProvider(health.connectorId)
  const healthPercent = health.healthScore ?? computeHealthPercent(
    health.connected,
    health.credentialStatus,
    health.lastTestStatus,
    health.lastFailureAt,
  )

  const connectionVariant = health.connected ? 'green' : health.lastFailureAt ? 'red' : 'amber'
  const connectionLabel = health.connected ? 'Connected' : health.lastFailureAt ? 'Disconnected' : 'Warning'

  if (compact) {
    return (
      <article className={styles.cardCompact}>
        <div className={styles.compactHeader}>
          <ConnectorLogo connectorId={health.connectorId} />
          <div className={styles.compactTitleBlock}>
            <h3 className={styles.title}>{provider.name}</h3>
            <StatusBadge label={connectionLabel} variant={connectionVariant} />
          </div>
          <HealthRing percent={healthPercent} />
        </div>

        <ul className={styles.statsList}>
          <li>
            <span className={styles.statLabel}>Last sync</span>
            <span className={styles.statValue}>{formatRelativeTime(health.lastSyncAt)}</span>
          </li>
          <li>
            <span className={styles.statLabel}>Articles</span>
            <span className={styles.statValue}>{health.articlesImported.toLocaleString()}</span>
          </li>
          <li>
            <span className={styles.statLabel}>Avg. response</span>
            <span className={styles.statValue}>
              {health.averageSyncTimeMs ? `${health.averageSyncTimeMs} ms` : '—'}
            </span>
          </li>
          {health.successRate != null && (
            <li>
              <span className={styles.statLabel}>Success rate</span>
              <span className={styles.statValue}>{health.successRate}%</span>
            </li>
          )}
        </ul>

        <div className={styles.credentialRow}>
          <span className={styles.credentialLabel}>Credential</span>
          <StatusBadge
            label={credentialLabel(health.credentialStatus)}
            variant={credentialVariant(health.credentialStatus)}
          />
        </div>

        <div className={styles.compactActions}>
          {onSyncNow && (
            <button
              type="button"
              className={styles.actionLink}
              onClick={onSyncNow}
              disabled={isSyncing}
            >
              <span aria-hidden="true">↻</span> {isSyncing ? 'Syncing…' : 'Sync'}
            </button>
          )}
          {onConfigure && (
            <button type="button" className={styles.actionLink} onClick={onConfigure}>
              <span aria-hidden="true">⚙</span> Configure
            </button>
          )}
          <ConnectionTestButton
            connectorId={health.connectorId}
            connectorName={provider.name}
            onComplete={onTestComplete}
            compact
          />
          <Link to={ROUTES.QUEUE} className={styles.actionLink}>
            <span aria-hidden="true">☰</span> History
          </Link>
        </div>
      </article>
    )
  }

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <ConnectorLogo connectorId={health.connectorId} size="lg" />
        <div className={styles.titleBlock}>
          <h3 className={styles.title}>{provider.name}</h3>
          <span className={styles.provider}>{provider.provider}</span>
        </div>
        <StatusBadge label={connectionLabel} variant={connectionVariant} />
      </div>

      <div className={styles.bodyRow}>
        <HealthRing percent={healthPercent} />
        <ul className={styles.statsList}>
          <li>
            <span className={styles.statLabel}>Last sync</span>
            <span className={styles.statValue}>{formatRelativeTime(health.lastSyncAt)}</span>
          </li>
          <li>
            <span className={styles.statLabel}>Articles imported</span>
            <span className={styles.statValue}>{health.articlesImported.toLocaleString()}</span>
          </li>
          <li>
            <span className={styles.statLabel}>Average response</span>
            <span className={styles.statValue}>
              {health.averageSyncTimeMs ? `${health.averageSyncTimeMs} ms` : '—'}
            </span>
          </li>
        </ul>
      </div>

      <div className={styles.credentialRow}>
        <span className={styles.credentialLabel}>Credential</span>
        <StatusBadge
          label={credentialLabel(health.credentialStatus)}
          variant={credentialVariant(health.credentialStatus)}
        />
      </div>

      <div className={styles.actions}>
        {onSyncNow && (
          <button type="button" className={styles.actionBtn} onClick={onSyncNow} disabled={isSyncing}>
            {isSyncing ? 'Syncing…' : 'Sync Now'}
          </button>
        )}
        {onConfigure && (
          <button type="button" className={styles.actionBtn} onClick={onConfigure}>
            Configure
          </button>
        )}
        <ConnectionTestButton
          connectorId={health.connectorId}
          connectorName={provider.name}
          onComplete={onTestComplete}
          compact
        />
        <Link to={ROUTES.QUEUE} className={styles.actionBtn}>
          View History
        </Link>
        <Link
          to={`${ROUTES.SOURCES_NEW}?source_type=${encodeURIComponent(provider.sourceWizardType)}`}
          className={styles.actionBtn}
        >
          Open wizard
        </Link>
      </div>
    </article>
  )
}
