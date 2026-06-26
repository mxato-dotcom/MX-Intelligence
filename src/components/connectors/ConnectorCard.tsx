import { Link } from 'react-router-dom'
import type { ConnectorCatalogEntry } from '@/intelligence/connectors/connectorCatalog'
import { ROUTES } from '@/lib/constants'
import styles from './ConnectorCard.module.css'

interface ConnectorCardProps {
  connector: ConnectorCatalogEntry
}

function CapabilityBadge({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <span
      className={
        enabled
          ? `${styles.capability} ${styles.capabilityEnabled}`
          : `${styles.capability} ${styles.capabilityDisabled}`
      }
    >
      {label}
    </span>
  )
}

export function ConnectorCard({ connector }: ConnectorCardProps) {
  const isAvailable = connector.status === 'available' && connector.implemented
  const newSourceUrl = `${ROUTES.SOURCES_NEW}?source_type=${encodeURIComponent(connector.type)}`

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.name}>{connector.name}</h3>
        <span
          className={
            isAvailable
              ? `${styles.status} ${styles.statusAvailable}`
              : `${styles.status} ${styles.statusComingSoon}`
          }
        >
          {isAvailable ? 'Available' : 'Coming Soon'}
        </span>
      </div>

      <p className={styles.category}>{connector.category}</p>
      <p className={styles.description}>{connector.description}</p>

      <div className={styles.capabilities}>
        <CapabilityBadge label="Trust" enabled={connector.capabilities.trust} />
        <CapabilityBadge label="Import" enabled={connector.capabilities.import} />
        <CapabilityBadge label="Preview" enabled={connector.capabilities.preview} />
      </div>

      <div className={styles.footer}>
        {isAvailable ? (
          <Link className={styles.useButton} to={newSourceUrl}>
            Use connector
          </Link>
        ) : (
          <button className={styles.comingSoonButton} type="button" disabled>
            Coming soon
          </button>
        )}
      </div>
    </article>
  )
}
