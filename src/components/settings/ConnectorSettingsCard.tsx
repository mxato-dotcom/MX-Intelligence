import { Link } from 'react-router-dom'
import { ConnectorHealthIndicator } from '@/components/settings/ConnectorHealthIndicator'
import { CredentialStatusBadge } from '@/components/settings/CredentialStatusBadge'
import { ConnectionTestButton } from '@/components/settings/ConnectionTestButton'
import { ROUTES } from '@/lib/constants'
import { formatDate } from '@/lib/format'
import type { ConnectorHealthRecord } from '@/types/connectorSettings'
import { getConnectorProvider } from '@/types/connectorSettings'
import styles from './ConnectorSettingsCard.module.css'
import shared from './settingsShared.module.css'

interface ConnectorSettingsCardProps {
  health: ConnectorHealthRecord
  onConfigure?: () => void
  onTestComplete?: () => void
}

function formatOptionalDate(value: string | null): string {
  if (!value) {
    return '—'
  }
  return formatDate(value)
}

export function ConnectorSettingsCard({
  health,
  onConfigure,
  onTestComplete,
}: ConnectorSettingsCardProps) {
  const provider = getConnectorProvider(health.connectorId)

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h3 className={styles.title}>{provider.name}</h3>
          <span className={styles.provider}>{provider.provider}</span>
        </div>
        <div className={shared.actions}>
          <ConnectorHealthIndicator health={health} />
          <CredentialStatusBadge status={health.credentialStatus} />
        </div>
      </div>

      <div className={styles.metaGrid}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Last sync</span>
          <span className={styles.metaValue}>{formatOptionalDate(health.lastSyncAt)}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Last successful sync</span>
          <span className={styles.metaValue}>
            {formatOptionalDate(health.lastSuccessfulSyncAt)}
          </span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Last failure</span>
          <span className={styles.metaValue}>{formatOptionalDate(health.lastFailureAt)}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Articles imported</span>
          <span className={styles.metaValue}>{health.articlesImported}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Avg sync time</span>
          <span className={styles.metaValue}>
            {health.averageSyncTimeMs ? `${health.averageSyncTimeMs} ms` : '—'}
          </span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Last tested</span>
          <span className={styles.metaValue}>{formatOptionalDate(health.lastTestedAt)}</span>
        </div>
      </div>

      {health.lastTestError && (
        <p className={styles.errorText}>Last error: {health.lastTestError}</p>
      )}
      {health.lastFailureError && (
        <p className={styles.errorText}>Sync failure: {health.lastFailureError}</p>
      )}

      <div className={styles.actions}>
        {onConfigure && (
          <button type="button" className={shared.buttonSecondary} onClick={onConfigure}>
            Configure
          </button>
        )}
        <ConnectionTestButton
          connectorId={health.connectorId}
          onComplete={onTestComplete}
        />
        <Link
          to={`${ROUTES.SOURCES_NEW}?source_type=${encodeURIComponent(provider.sourceWizardType)}`}
          className={styles.linkButton}
        >
          Open source wizard
        </Link>
      </div>
    </article>
  )
}
