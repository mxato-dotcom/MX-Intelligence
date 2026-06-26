import type { ConnectionTestStatus } from '@/types/connectorSettings'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
import styles from './ConnectionResultCard.module.css'

const FAILURE_TITLES: Partial<Record<ConnectionTestStatus, string>> = {
  auth_failed: 'Invalid API Key',
  rate_limited: 'Rate Limited',
  network_error: 'Network Error',
  provider_error: 'Provider Error',
  unknown: 'Connection Failed',
}

const SUGGESTIONS: Partial<Record<ConnectionTestStatus, string[]>> = {
  auth_failed: ['Verify API key', 'Check provider account', 'Try again'],
  rate_limited: ['Wait before retrying', 'Reduce sync frequency', 'Check provider quota'],
  network_error: ['Check your internet connection', 'Try again in a moment', 'Verify firewall settings'],
  provider_error: ['Check provider status page', 'Try again later', 'Review connector configuration'],
  unknown: ['Try again', 'Check configuration', 'Contact support if the issue persists'],
}

interface ConnectionResultCardProps {
  status: ConnectionTestStatus | null
  message: string | null
  latencyMs?: number
  testedAt?: string | null
  isLoading?: boolean
  connectorName?: string
}

export function ConnectionResultCard({
  status,
  message,
  latencyMs,
  testedAt,
  isLoading = false,
  connectorName,
}: ConnectionResultCardProps) {
  if (isLoading) {
    return (
      <div className={styles.card}>
        <div className={styles.loading}>
          <span className={styles.spinner} aria-hidden="true" />
          Connecting…
        </div>
      </div>
    )
  }

  if (!status || !message) {
    return null
  }

  if (status === 'connecting') {
    return (
      <div className={styles.card}>
        <div className={styles.loading}>
          <span className={styles.spinner} aria-hidden="true" />
          Connecting…
        </div>
      </div>
    )
  }

  const isSuccess = status === 'connected'
  const title = isSuccess
    ? 'Connection Successful'
    : FAILURE_TITLES[status] ?? 'Connection Failed'

  const cardClass = isSuccess ? styles.cardSuccess : styles.cardError

  return (
    <div className={`${styles.card} ${cardClass}`}>
      <div className={isSuccess ? styles.successHeader : styles.errorHeader}>
        <span aria-hidden="true">{isSuccess ? '✓' : '✖'}</span>
        {title}
      </div>

      {isSuccess ? (
        <div className={styles.grid}>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Latency</span>
            <span className={styles.metricValue}>
              {latencyMs != null ? `${latencyMs} ms` : '—'}
            </span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>API quota remaining</span>
            <span className={styles.metricValue}>
              {connectorName === 'NewsAPI' ? 'Check provider dashboard' : '—'}
            </span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Last tested</span>
            <span className={styles.metricValue}>
              {testedAt ? formatRelativeTime(testedAt) : 'Just now'}
            </span>
          </div>
        </div>
      ) : (
        <>
          <p className={styles.sectionTitle}>Reason</p>
          <p className={styles.reason}>{message}</p>
          {SUGGESTIONS[status] && (
            <>
              <p className={styles.sectionTitle}>Suggestions</p>
              <ul className={styles.suggestions}>
                {SUGGESTIONS[status]!.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  )
}
