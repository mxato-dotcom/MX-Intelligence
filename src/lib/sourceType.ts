import { isConnectorImplemented } from '@/intelligence/connector/connectorRegistry'

/** Case-insensitive RSS source type check. */
export function isRssSource(sourceType: string): boolean {
  return sourceType.trim().toLowerCase() === 'rss'
}

export function supportsRssFeed(sourceType: string): boolean {
  return isConnectorImplemented(sourceType)
}

export function isConnectorPreviewAvailable(sourceType: string): boolean {
  return isConnectorImplemented(sourceType)
}
