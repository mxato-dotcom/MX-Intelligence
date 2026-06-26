import { Link } from 'react-router-dom'
import { sourceDetailPath } from '@/lib/constants'
import {
  formatConnectorActivity,
  type ConnectorActivityRow,
  type ConnectorStatRow,
} from '@/services/connectorStatsService'
import styles from './ConnectorDashboardCard.module.css'

interface ConnectorStatsSectionProps {
  title: string
  rows: ConnectorStatRow[]
  valueKey: 'articleCount' | 'sourceCount'
}

function ConnectorStatsSection({ title, rows, valueKey }: ConnectorStatsSectionProps) {
  return (
    <section className={styles.card}>
      <h3 className={styles.title}>{title}</h3>
      {rows.length === 0 ? (
        <p className={styles.empty}>No connector data yet.</p>
      ) : (
        <ul className={styles.list}>
          {rows.map((row) => (
            <li key={row.connectorType} className={styles.row}>
              <span className={styles.label}>{row.connectorType}</span>
              <span className={styles.value}>{row[valueKey]}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

interface ConnectorActivitySectionProps {
  activity: ConnectorActivityRow[]
}

function ConnectorActivitySection({ activity }: ConnectorActivitySectionProps) {
  return (
    <section className={styles.card}>
      <h3 className={styles.title}>Latest connector activity</h3>
      {activity.length === 0 ? (
        <p className={styles.empty}>No sync activity yet.</p>
      ) : (
        <ul className={styles.activityList}>
          {activity.map((row) => (
            <li key={row.sourceId} className={styles.activityRow}>
              <div className={styles.activityMain}>
                <Link to={sourceDetailPath(row.sourceId)} className={styles.activityLink}>
                  {row.sourceName}
                </Link>
                <span className={styles.badge}>{row.connectorType}</span>
              </div>
              <div className={styles.activityMeta}>
                <span>{formatConnectorActivity(row)}</span>
                <span>Trust {row.trustScore}</span>
                <span>{row.itemsCollected ?? 0} items</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

interface ConnectorDashboardCardsProps {
  articlesByConnector: ConnectorStatRow[]
  sourcesByConnector: ConnectorStatRow[]
  latestActivity: ConnectorActivityRow[]
}

export function ConnectorDashboardCards({
  articlesByConnector,
  sourcesByConnector,
  latestActivity,
}: ConnectorDashboardCardsProps) {
  return (
    <div className={styles.grid}>
      <ConnectorStatsSection
        title="Articles by connector"
        rows={articlesByConnector}
        valueKey="articleCount"
      />
      <ConnectorStatsSection
        title="Sources by connector"
        rows={sourcesByConnector}
        valueKey="sourceCount"
      />
      <ConnectorActivitySection activity={latestActivity} />
    </div>
  )
}
