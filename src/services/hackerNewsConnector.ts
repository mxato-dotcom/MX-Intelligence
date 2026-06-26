import { hackerNewsConnector } from '@/intelligence/connector/connectors/HackerNewsConnector'
import type { ConnectorProvider } from '@/intelligence/connector/ConnectorProvider'
import { calculateHealthScore } from '@/services/connectorMetricsService'
import { getConnectorHealthRecords } from '@/services/connectorHealthService'
import * as connectorCredentialService from '@/services/connectorCredentialService'
import { runConnectorImportPipeline } from '@/services/connectorImportPipeline'

const provider: ConnectorProvider = {
  connectorId: 'hacker_news',
  catalogType: 'Hacker News',

  async testConnection() {
    return connectorCredentialService.testConnectorConnection('hacker_news')
  },

  async sync(source, userId, selectedIds) {
    return runConnectorImportPipeline(source, userId, selectedIds)
  },

  async collect(source) {
    return hackerNewsConnector.collect(source)
  },

  async normalize(source, raw) {
    return hackerNewsConnector.normalize(source, raw)
  },

  async validate(source) {
    return hackerNewsConnector.validate(source)
  },

  async preview(source) {
    return hackerNewsConnector.preview(source)
  },

  async healthCheck(source) {
    return hackerNewsConnector.healthCheck(source)
  },

  async calculateHealth() {
    const records = await getConnectorHealthRecords()
    const record = records.find((entry) => entry.connectorId === 'hacker_news')
    return record ? calculateHealthScore(record) : 0
  },
}

export default provider
