import { googleNewsConnector } from '@/intelligence/connector/connectors/GoogleNewsConnector'
import type { ConnectorProvider } from '@/intelligence/connector/ConnectorProvider'
import { calculateHealthScore } from '@/services/connectorMetricsService'
import { getConnectorHealthRecords } from '@/services/connectorHealthService'
import * as connectorCredentialService from '@/services/connectorCredentialService'
import { runConnectorImportPipeline } from '@/services/connectorImportPipeline'

const provider: ConnectorProvider = {
  connectorId: 'google_news',
  catalogType: 'Google News',

  async testConnection() {
    return connectorCredentialService.testConnectorConnection('google_news')
  },

  async sync(source, userId, selectedIds) {
    return runConnectorImportPipeline(source, userId, selectedIds)
  },

  async collect(source) {
    return googleNewsConnector.collect(source)
  },

  async normalize(source, raw) {
    return googleNewsConnector.normalize(source, raw)
  },

  async validate(source) {
    return googleNewsConnector.validate(source)
  },

  async preview(source) {
    return googleNewsConnector.preview(source)
  },

  async healthCheck(source) {
    return googleNewsConnector.healthCheck(source)
  },

  async calculateHealth() {
    const records = await getConnectorHealthRecords()
    const record = records.find((entry) => entry.connectorId === 'google_news')
    return record ? calculateHealthScore(record) : 0
  },
}

export default provider
