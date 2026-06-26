import type { ConnectorId } from '@/types/connectorSettings'
import styles from './ConnectorLogo.module.css'

const LOGO_LABELS: Record<ConnectorId, string> = {
  newsapi: 'NA',
  reddit: 'R',
  google_news: 'GN',
  hacker_news: 'HN',
  rss: 'RSS',
}

interface ConnectorLogoProps {
  connectorId: ConnectorId
  size?: 'md' | 'lg'
}

export function ConnectorLogo({ connectorId, size = 'md' }: ConnectorLogoProps) {
  return (
    <div
      className={`${styles.logo} ${styles[connectorId]} ${size === 'lg' ? styles.lg : ''}`}
      aria-hidden="true"
    >
      {LOGO_LABELS[connectorId]}
    </div>
  )
}
