/** Case-insensitive RSS source type check. */
export function isRssSource(sourceType: string): boolean {
  return sourceType.trim().toLowerCase() === 'rss'
}

export function supportsRssFeed(sourceType: string): boolean {
  return isRssSource(sourceType)
}
