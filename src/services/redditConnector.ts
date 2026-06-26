import { redditConnector } from '@/intelligence/connector/connectors/RedditConnector'
import type { ConnectorProvider } from '@/intelligence/connector/ConnectorProvider'
import { calculateHealthScore } from '@/services/connectorMetricsService'
import { getConnectorHealthRecords } from '@/services/connectorHealthService'
import * as connectorCredentialService from '@/services/connectorCredentialService'
import { runConnectorImportPipeline } from '@/services/connectorImportPipeline'

export const REDDIT_DEFAULT_SUBREDDITS = [
  'worldnews',
  'technology',
  'artificial',
  'cybersecurity',
  'cryptocurrency',
  'programming',
  'MachineLearning',
] as const

const provider: ConnectorProvider = {
  connectorId: 'reddit',
  catalogType: 'Reddit',

  async testConnection() {
    return connectorCredentialService.testConnectorConnection('reddit')
  },

  async sync(source, userId, selectedIds) {
    return runConnectorImportPipeline(source, userId, selectedIds)
  },

  async collect(source) {
    return redditConnector.collect(source)
  },

  async normalize(source, raw) {
    return redditConnector.normalize(source, raw)
  },

  async validate(source) {
    return redditConnector.validate(source)
  },

  async preview(source) {
    return redditConnector.preview(source)
  },

  async healthCheck(source) {
    return redditConnector.healthCheck(source)
  },

  async calculateHealth() {
    const records = await getConnectorHealthRecords()
    const record = records.find((entry) => entry.connectorId === 'reddit')
    return record ? calculateHealthScore(record) : 0
  },
}

export default provider
