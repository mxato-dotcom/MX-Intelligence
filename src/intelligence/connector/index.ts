import { getConnector } from '@/intelligence/connector/connectorRegistry'
import { rssConnector } from '@/intelligence/connector/connectors/RSSConnector'

export {
  getConnector,
  getSupportedTypes,
  isConnectorImplemented,
  isConnectorSupported,
  registerConnector,
} from '@/intelligence/connector/connectorRegistry'

export type { IntelligenceConnector } from '@/intelligence/connector/IntelligenceConnector'

/** @deprecated Use getConnector from connectorRegistry. */
export function getConnectorForSourceType(sourceType: string) {
  return getConnector(sourceType)
}

export { rssConnector }
