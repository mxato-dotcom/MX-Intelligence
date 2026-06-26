export type ConnectorId = 'newsapi' | 'reddit' | 'google_news' | 'hacker_news' | 'rss'

export type ConnectionTestStatus =
  | 'connecting'
  | 'connected'
  | 'auth_failed'
  | 'rate_limited'
  | 'network_error'
  | 'provider_error'
  | 'unknown'

export type CredentialStatus = 'configured' | 'partial' | 'missing'

export type DuplicateDetectionMode = 'strict' | 'normal' | 'lenient'

export interface GoogleNewsSettings {
  language: string
  country: string
  defaultSearchQuery: string
  maxArticles: number
  refreshInterval: string
}

export interface HackerNewsSettings {
  category: 'top' | 'best' | 'new' | 'ask' | 'show' | 'jobs'
  maxStories: number
  refreshInterval: string
}

export interface RssDefaultsSettings {
  defaultRefreshInterval: string
  maxArticlesPerSync: number
  duplicateDetectionMode: DuplicateDetectionMode
  trustScoreDefault: number
}

export interface UserConnectorSettingsPayload {
  google_news?: Partial<GoogleNewsSettings>
  hacker_news?: Partial<HackerNewsSettings>
  rss?: Partial<RssDefaultsSettings>
}

export interface ConnectorHealthRecord {
  connectorId: ConnectorId
  connected: boolean
  credentialStatus: CredentialStatus
  lastTestedAt: string | null
  lastTestStatus: ConnectionTestStatus | null
  lastTestError: string | null
  lastSyncAt: string | null
  lastSuccessfulSyncAt: string | null
  lastFailureAt: string | null
  lastFailureError: string | null
  articlesImported: number
  averageSyncTimeMs: number | null
  healthScore?: number | null
  successRate?: number | null
  remainingQuota?: string | null
  lastHttpStatus?: number | null
  totalSyncs?: number
  failedSyncs?: number
}

export interface ConnectionTestResult {
  connected: boolean
  status: ConnectionTestStatus | 'healthy' | 'failed'
  message: string
  latencyMs?: number
  quotaRemaining?: number | string | null
}

export interface CredentialProviderStatus {
  provider: string
  configured: boolean
}

export interface ConnectorReadiness {
  connectorId: ConnectorId
  ready: boolean
  credentialStatus: CredentialStatus
  missingCredentials: string[]
  message: string
}

export interface ConnectorProviderDefinition {
  id: ConnectorId
  name: string
  provider: string
  catalogType: string
  requiredCredentialProviders: string[]
  optionalCredentialProviders: string[]
  credentialLabels: Record<string, string>
  settingsPath: string
  sourceWizardType: string
}

export const CREDENTIAL_PROVIDER_LABELS: Record<string, string> = {
  newsapi: 'API Key',
  reddit_client_id: 'Client ID',
  reddit_client_secret: 'Client Secret',
  reddit_refresh_token: 'Refresh Token',
}

export const CONNECTOR_PROVIDERS: ConnectorProviderDefinition[] = [
  {
    id: 'newsapi',
    name: 'NewsAPI',
    provider: 'NewsAPI.org',
    catalogType: 'NewsAPI',
    requiredCredentialProviders: ['newsapi'],
    optionalCredentialProviders: [],
    credentialLabels: { newsapi: 'API Key' },
    settingsPath: 'newsapi',
    sourceWizardType: 'NewsAPI',
  },
  {
    id: 'reddit',
    name: 'Reddit',
    provider: 'Reddit',
    catalogType: 'Reddit',
    requiredCredentialProviders: [],
    optionalCredentialProviders: [
      'reddit_client_id',
      'reddit_client_secret',
      'reddit_refresh_token',
    ],
    credentialLabels: {
      reddit_client_id: 'Client ID',
      reddit_client_secret: 'Client Secret',
      reddit_refresh_token: 'Refresh Token',
    },
    settingsPath: 'reddit',
    sourceWizardType: 'Reddit',
  },
  {
    id: 'google_news',
    name: 'Google News',
    provider: 'Google',
    catalogType: 'Google News',
    requiredCredentialProviders: [],
    optionalCredentialProviders: [],
    credentialLabels: {},
    settingsPath: 'google-news',
    sourceWizardType: 'Google News',
  },
  {
    id: 'hacker_news',
    name: 'Hacker News',
    provider: 'Y Combinator',
    catalogType: 'Hacker News',
    requiredCredentialProviders: [],
    optionalCredentialProviders: [],
    credentialLabels: {},
    settingsPath: 'hacker-news',
    sourceWizardType: 'Hacker News',
  },
  {
    id: 'rss',
    name: 'RSS',
    provider: 'RSS / Atom',
    catalogType: 'RSS',
    requiredCredentialProviders: [],
    optionalCredentialProviders: [],
    credentialLabels: {},
    settingsPath: 'rss-defaults',
    sourceWizardType: 'RSS',
  },
]

export const DEFAULT_GOOGLE_NEWS_SETTINGS: GoogleNewsSettings = {
  language: 'en-US',
  country: 'US',
  defaultSearchQuery: 'technology',
  maxArticles: 25,
  refreshInterval: '24h',
}

export const DEFAULT_HACKER_NEWS_SETTINGS: HackerNewsSettings = {
  category: 'top',
  maxStories: 30,
  refreshInterval: '6h',
}

export const DEFAULT_RSS_SETTINGS: RssDefaultsSettings = {
  defaultRefreshInterval: '24h',
  maxArticlesPerSync: 50,
  duplicateDetectionMode: 'normal',
  trustScoreDefault: 80,
}

export function getConnectorProvider(id: ConnectorId): ConnectorProviderDefinition {
  const provider = CONNECTOR_PROVIDERS.find((entry) => entry.id === id)
  if (!provider) {
    throw new Error(`Unknown connector: ${id}`)
  }
  return provider
}

export function catalogTypeToConnectorId(sourceType: string): ConnectorId | null {
  const normalized = sourceType.trim().toLowerCase()
  const match = CONNECTOR_PROVIDERS.find(
    (entry) =>
      entry.catalogType.toLowerCase() === normalized ||
      entry.name.toLowerCase() === normalized,
  )
  return match?.id ?? null
}

export function connectorIdToCatalogType(id: ConnectorId): string {
  return getConnectorProvider(id).catalogType
}
