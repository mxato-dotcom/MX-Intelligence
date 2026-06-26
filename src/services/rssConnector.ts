import { rssConnector } from '@/intelligence/connector/connectors/RSSConnector'
import type { ConnectorProvider } from '@/intelligence/connector/ConnectorProvider'
import { calculateHealthScore } from '@/services/connectorMetricsService'
import { getConnectorHealthRecords } from '@/services/connectorHealthService'
import * as connectorCredentialService from '@/services/connectorCredentialService'
import { runConnectorImportPipeline } from '@/services/connectorImportPipeline'

const provider: ConnectorProvider = {
  connectorId: 'rss',
  catalogType: 'RSS',

  async testConnection() {
    return connectorCredentialService.testConnectorConnection('rss')
  },

  async sync(source, userId, selectedIds) {
    return runConnectorImportPipeline(source, userId, selectedIds)
  },

  async collect(source) {
    return rssConnector.collect(source)
  },

  async normalize(source, raw) {
    return rssConnector.normalize(source, raw)
  },

  async validate(source) {
    return rssConnector.validate(source)
  },

  async preview(source) {
    return rssConnector.preview(source)
  },

  async healthCheck(source) {
    return rssConnector.healthCheck(source)
  },

  async calculateHealth() {
    const records = await getConnectorHealthRecords()
    const record = records.find((entry) => entry.connectorId === 'rss')
    return record ? calculateHealthScore(record) : 0
  },
}

export default provider
