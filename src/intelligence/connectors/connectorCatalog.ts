export type ConnectorCatalogStatus = 'available' | 'coming_soon'

export interface ConnectorCatalogCapabilities {
  trust: boolean
  import: boolean
  preview: boolean
}

export interface ConnectorCatalogEntry {
  type: string
  name: string
  description: string
  category: string
  status: ConnectorCatalogStatus
  capabilities: ConnectorCatalogCapabilities
  implemented: boolean
}

export const CONNECTOR_CATALOG: ConnectorCatalogEntry[] = [
  {
    type: 'RSS',
    name: 'RSS',
    description:
      'Collect articles from RSS and Atom feeds. Preview items, import non-duplicates, and sync on a schedule.',
    category: 'Feeds',
    status: 'available',
    capabilities: { trust: true, import: true, preview: true },
    implemented: true,
  },
  {
    type: 'YouTube',
    name: 'YouTube',
    description:
      'Monitor channels and playlists for new videos, summaries, and metadata from YouTube sources.',
    category: 'Video',
    status: 'coming_soon',
    capabilities: { trust: true, import: true, preview: true },
    implemented: false,
  },
  {
    type: 'Reddit',
    name: 'Reddit',
    description:
      'Track subreddits and threads for trending discussions, links, and community intelligence.',
    category: 'Social',
    status: 'coming_soon',
    capabilities: { trust: true, import: true, preview: true },
    implemented: false,
  },
  {
    type: 'X',
    name: 'X',
    description:
      'Follow accounts and topics on X for real-time posts, links, and trending intelligence signals.',
    category: 'Social',
    status: 'coming_soon',
    capabilities: { trust: true, import: true, preview: true },
    implemented: false,
  },
  {
    type: 'GitHub',
    name: 'GitHub',
    description:
      'Watch repositories, releases, and commits for open-source and engineering intelligence.',
    category: 'Developer',
    status: 'coming_soon',
    capabilities: { trust: true, import: true, preview: true },
    implemented: false,
  },
  {
    type: 'Google News',
    name: 'Google News',
    description:
      'Aggregate headlines and stories from Google News topics and search queries.',
    category: 'News',
    status: 'coming_soon',
    capabilities: { trust: true, import: true, preview: true },
    implemented: false,
  },
  {
    type: 'NewsAPI',
    name: 'NewsAPI',
    description:
      'Pull structured news articles from NewsAPI endpoints with keyword and outlet filters.',
    category: 'News',
    status: 'coming_soon',
    capabilities: { trust: true, import: true, preview: true },
    implemented: false,
  },
  {
    type: 'Medium',
    name: 'Medium',
    description:
      'Import essays and publications from Medium authors, publications, and RSS bridges.',
    category: 'Publishing',
    status: 'coming_soon',
    capabilities: { trust: true, import: true, preview: true },
    implemented: false,
  },
  {
    type: 'Hacker News',
    name: 'Hacker News',
    description:
      'Surface top stories and discussions from Hacker News for tech and startup intelligence.',
    category: 'Developer',
    status: 'coming_soon',
    capabilities: { trust: true, import: true, preview: true },
    implemented: false,
  },
  {
    type: 'Dev.to',
    name: 'Dev.to',
    description:
      'Collect developer articles and community posts from Dev.to tags and authors.',
    category: 'Developer',
    status: 'coming_soon',
    capabilities: { trust: true, import: true, preview: true },
    implemented: false,
  },
  {
    type: 'Custom API',
    name: 'Custom API',
    description:
      'Connect proprietary REST or JSON APIs with custom authentication and field mapping.',
    category: 'API',
    status: 'coming_soon',
    capabilities: { trust: true, import: true, preview: true },
    implemented: false,
  },
]

export function getConnectorCatalogEntry(type: string): ConnectorCatalogEntry | undefined {
  const normalized = type.trim().toLowerCase()
  return CONNECTOR_CATALOG.find(
    (entry) =>
      entry.type.toLowerCase() === normalized ||
      entry.name.toLowerCase() === normalized,
  )
}

export function getImplementedConnectors(): ConnectorCatalogEntry[] {
  return CONNECTOR_CATALOG.filter((entry) => entry.implemented)
}
