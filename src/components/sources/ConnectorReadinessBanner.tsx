import { Link } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'
import type { ConnectorReadiness } from '@/types/connectorSettings'
import styles from './ConnectorReadinessBanner.module.css'

interface ConnectorReadinessBannerProps {
  readiness: ConnectorReadiness | null
  isLoading?: boolean
}

export function ConnectorReadinessBanner({
  readiness,
  isLoading = false,
}: ConnectorReadinessBannerProps) {
  if (isLoading) {
    return <div className={styles.bannerSkeleton}>Checking connector credentials…</div>
  }

  if (!readiness) {
    return null
  }

  const settingsHash = readiness.connectorId.replace('_', '-')

  return (
    <div
      className={readiness.ready ? styles.bannerReady : styles.bannerMissing}
      role="status"
    >
      <div className={styles.content}>
        <strong>{readiness.ready ? 'Ready' : 'No credentials configured'}</strong>
        <span>{readiness.message}</span>
      </div>
      {!readiness.ready && (
        <Link
          to={`${ROUTES.SETTINGS}#${settingsHash}`}
          className={styles.configureLink}
        >
          Configure connector
        </Link>
      )}
    </div>
  )
}
