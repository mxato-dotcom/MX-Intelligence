import { ConnectorLogo } from '@/components/settings/ConnectorLogo'
import type { ConnectorId } from '@/types/connectorSettings'
import styles from './ConnectorConfigHeader.module.css'

interface ConnectorConfigHeaderProps {
  connectorId: ConnectorId
  title: string
  description: string
}

export function ConnectorConfigHeader({
  connectorId,
  title,
  description,
}: ConnectorConfigHeaderProps) {
  return (
    <header className={styles.header}>
      <ConnectorLogo connectorId={connectorId} size="lg" />
      <div className={styles.titleBlock}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>{description}</p>
      </div>
    </header>
  )
}
