import type { ConnectorHealthRecord } from '@/types/connectorSettings'
import styles from './ConnectorHealthIndicator.module.css'

interface ConnectorHealthIndicatorProps {
  health: ConnectorHealthRecord
}

export function ConnectorHealthIndicator({ health }: ConnectorHealthIndicatorProps) {
  const state = health.connected ? 'connected' : health.lastFailureAt ? 'disconnected' : 'degraded'
  const label = health.connected ? 'Connected' : health.lastFailureAt ? 'Disconnected' : 'Unknown'

  return (
    <span className={styles.indicator}>
      <span className={`${styles.dot} ${styles[state]}`} />
      <span className={styles.label}>{label}</span>
    </span>
  )
}
