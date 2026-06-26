import { formatDate } from '@/lib/format'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
import styles from './CredentialStatusCard.module.css'

interface CredentialStatusCardProps {
  title?: string
  configured: boolean
  connected?: boolean
  lastUpdatedAt?: string | null
  isLoading?: boolean
}

export function CredentialStatusCard({
  title = 'Credential Status',
  configured,
  connected = false,
  lastUpdatedAt,
  isLoading = false,
}: CredentialStatusCardProps) {
  if (isLoading) {
    return (
      <div className={styles.card}>
        <p className={styles.title}>{title}</p>
        <p className={styles.loadingText}>Loading credential status…</p>
      </div>
    )
  }

  const showConnected = configured && connected

  const cardClass = configured
    ? showConnected
      ? styles.cardConnected
      : styles.cardWarning
    : styles.cardMissing

  return (
    <div className={`${styles.card} ${cardClass}`}>
      <p className={styles.title}>{title}</p>

      <div className={styles.statusBlock}>
        <div className={styles.statusRow}>
          {configured ? (
            <>
              <span
                className={`${styles.statusIcon} ${showConnected ? styles.statusIconSuccess : ''}`}
                aria-hidden="true"
              >
                {showConnected ? '✓' : '◐'}
              </span>
              <span className={styles.statusText}>
                {showConnected ? 'Connected' : 'Configured'}
              </span>
            </>
          ) : (
            <>
              <span className={`${styles.statusIcon} ${styles.statusIconError}`} aria-hidden="true">
                ●
              </span>
              <span className={styles.statusText}>Missing</span>
            </>
          )}
        </div>

        {configured ? (
          <p className={styles.secureNote}>
            <span aria-hidden="true">🔒</span>
            Stored securely
          </p>
        ) : (
          <p className={styles.missingNote}>No API key configured.</p>
        )}
      </div>

      {configured && (
        <div className={styles.metaBlock}>
          <div className={styles.metaLabel}>Last updated</div>
          <div className={styles.metaValue}>
            {lastUpdatedAt ? formatDate(lastUpdatedAt) : '—'}
          </div>
          {lastUpdatedAt && (
            <p className={styles.metaRelative}>{formatRelativeTime(lastUpdatedAt)}</p>
          )}
        </div>
      )}
    </div>
  )
}
