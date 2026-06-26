import { newsApiConnector } from '@/intelligence/connector/connectors/NewsAPIConnector'
import type { ConnectorProvider } from '@/intelligence/connector/ConnectorProvider'
import { calculateHealthScore } from '@/services/connectorMetricsService'
import { getConnectorHealthRecords } from '@/services/connectorHealthService'
import * as connectorCredentialService from '@/services/connectorCredentialService'
import { runConnectorImportPipeline } from '@/services/connectorImportPipeline'

export const NEWSAPI_TOPIC_PRESETS: Record<string, string> = {
  'Artificial Intelligence': 'artificial intelligence',
  'Cyber Security': 'cybersecurity OR cyber security',
  Cryptocurrency: 'cryptocurrency OR bitcoin OR ethereum',
  Technology: 'technology',
  Business: 'business',
  Politics: 'politics',
  'World News': 'world news',
  Sports: 'sports',
  Somalia: 'Somalia',
}

const provider: ConnectorProvider = {
  connectorId: 'newsapi',
  catalogType: 'NewsAPI',

  async testConnection() {
    return connectorCredentialService.testConnectorConnection('newsapi')
  },

  async sync(source, userId, selectedIds) {
    return runConnectorImportPipeline(source, userId, selectedIds)
  },

  async collect(source) {
    return newsApiConnector.collect(source)
  },

  async normalize(source, raw) {
    return newsApiConnector.normalize(source, raw)
  },

  async validate(source) {
    return newsApiConnector.validate(source)
  },

  async preview(source) {
    return newsApiConnector.preview(source)
  },

  async healthCheck(source) {
    return newsApiConnector.healthCheck(source)
  },

  async calculateHealth() {
    const records = await getConnectorHealthRecords()
    const record = records.find((entry) => entry.connectorId === 'newsapi')
    return record ? calculateHealthScore(record) : 0
  },
}

export default provider
