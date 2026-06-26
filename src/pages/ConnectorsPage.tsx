import { ConnectorCard } from '@/components/connectors/ConnectorCard'
import { PageContainer } from '@/components/layout/PageContainer'
import { CONNECTOR_CATALOG } from '@/intelligence/connectors/connectorCatalog'
import { trustScoreEngine } from '@/intelligence/scoring/TrustScoreEngine'
import { useSources } from '@/hooks/useSources'
import styles from './ConnectorsPage.module.css'

export function ConnectorsPage() {
  const { sources } = useSources()
  const availableCount = CONNECTOR_CATALOG.filter((entry) => entry.implemented).length
  const trustSummaries = trustScoreEngine.computeConnectorTrustSummaries(sources)

  return (
    <PageContainer
      title="Connector Marketplace"
      description="Browse intelligence connectors to collect, preview, and import content from external sources."
    >
      <div className={styles.summary}>
        <p className={styles.summaryText}>
          {availableCount} connector available · {CONNECTOR_CATALOG.length - availableCount} coming soon
        </p>
      </div>

      <div className={styles.grid}>
        {CONNECTOR_CATALOG.map((connector) => (
          <ConnectorCard
            key={connector.type}
            connector={connector}
            trustSummary={trustSummaries.find((entry) => entry.connectorType === connector.type)}
          />
        ))}
      </div>
    </PageContainer>
  )
}
