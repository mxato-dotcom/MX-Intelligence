import type { IntelligenceConnector } from '@/intelligence/connector/IntelligenceConnector'
import { PlaceholderConnector } from '@/intelligence/connector/BasePlaceholderConnector'
import {
  cisaConnector,
  coinGeckoConnector,
  customApiConnector,
  devToConnector,
  gdeltConnector,
  githubConnector,
  mediumConnector,
  mitreConnector,
  nistConnector,
  xConnector,
  youtubeConnector,
} from '@/intelligence/connector/connectors/placeholders'
import { googleNewsConnector } from '@/intelligence/connector/connectors/GoogleNewsConnector'
import { hackerNewsConnector } from '@/intelligence/connector/connectors/HackerNewsConnector'
import { newsApiConnector } from '@/intelligence/connector/connectors/NewsAPIConnector'
import { redditConnector } from '@/intelligence/connector/connectors/RedditConnector'
import { rssConnector } from '@/intelligence/connector/connectors/RSSConnector'

const connectorRegistry = new Map<string, IntelligenceConnector>()

const TYPE_ALIASES: Record<string, string> = {
  rss: 'RSS',
  youtube: 'YouTube',
  reddit: 'Reddit',
  x: 'X',
  twitter: 'X',
  github: 'GitHub',
  'google news': 'Google News',
  medium: 'Medium',
  'hacker news': 'Hacker News',
  'dev.to': 'Dev.to',
  devto: 'Dev.to',
  newsapi: 'NewsAPI',
  'news api': 'NewsAPI',
  'custom api': 'Custom API',
  gdelt: 'GDELT',
  cisa: 'CISA',
  nist: 'NIST',
  mitre: 'MITRE',
  coingecko: 'CoinGecko',
}

function resolveConnectorKey(sourceType: string): string {
  const trimmed = sourceType.trim()
  const alias = TYPE_ALIASES[trimmed.toLowerCase()]
  if (alias) {
    return alias
  }
  return trimmed
}

export function registerConnector(connector: IntelligenceConnector, aliases: string[] = []): void {
  connectorRegistry.set(connector.type, connector)

  for (const alias of aliases) {
    connectorRegistry.set(alias, connector)
  }
}

export function getConnector(sourceType: string): IntelligenceConnector {
  const resolvedKey = resolveConnectorKey(sourceType)
  const connector = connectorRegistry.get(resolvedKey)

  if (connector) {
    return connector
  }

  return new PlaceholderConnector(resolvedKey || sourceType.trim() || 'Unknown')
}

export function getSupportedTypes(): string[] {
  const uniqueTypes = new Set<string>()

  for (const connector of connectorRegistry.values()) {
    uniqueTypes.add(connector.type)
  }

  return [...uniqueTypes].sort()
}

export function isConnectorImplemented(sourceType: string): boolean {
  return getConnector(sourceType).implemented
}

export type ConnectorAction = 'preview' | 'import' | 'validate' | 'healthCheck'

export interface ConnectorCapabilities {
  preview: boolean
  import: boolean
  validate: boolean
  healthCheck: boolean
}

export function isConnectorSupported(sourceType: string): boolean {
  return isConnectorImplemented(sourceType)
}

export function getSupportedConnectorTypes(): string[] {
  return getSupportedTypes()
}

export function getConnectorCapabilities(_sourceType: string): ConnectorCapabilities {
  return { preview: true, import: true, validate: true, healthCheck: true }
}

function bootstrapConnectors(): void {
  registerConnector(rssConnector, ['rss'])
  registerConnector(newsApiConnector, ['newsapi', 'news api'])
  registerConnector(googleNewsConnector, ['google news'])
  registerConnector(redditConnector, ['reddit'])
  registerConnector(hackerNewsConnector, ['hacker news'])
  registerConnector(youtubeConnector, ['youtube'])
  registerConnector(xConnector, ['x', 'twitter'])
  registerConnector(githubConnector, ['github'])
  registerConnector(mediumConnector, ['medium'])
  registerConnector(devToConnector, ['dev.to', 'devto'])
  registerConnector(customApiConnector, ['custom api'])
  registerConnector(gdeltConnector, ['gdelt'])
  registerConnector(cisaConnector, ['cisa'])
  registerConnector(nistConnector, ['nist'])
  registerConnector(mitreConnector, ['mitre'])
  registerConnector(coinGeckoConnector, ['coingecko'])
}

bootstrapConnectors()
