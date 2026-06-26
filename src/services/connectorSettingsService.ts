import type {
  GoogleNewsSettings,
  HackerNewsSettings,
  RssDefaultsSettings,
  UserConnectorSettingsPayload,
} from '@/types/connectorSettings'
import {
  DEFAULT_GOOGLE_NEWS_SETTINGS,
  DEFAULT_HACKER_NEWS_SETTINGS,
  DEFAULT_RSS_SETTINGS,
} from '@/types/connectorSettings'

const STORAGE_KEY = 'mx_connector_settings'

function readStoredPayload(): UserConnectorSettingsPayload {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {}
    }
    return JSON.parse(raw) as UserConnectorSettingsPayload
  } catch {
    return {}
  }
}

function writeStoredPayload(payload: UserConnectorSettingsPayload): void {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

function mergeGoogleNews(partial?: Partial<GoogleNewsSettings>): GoogleNewsSettings {
  return {
    language: partial?.language ?? DEFAULT_GOOGLE_NEWS_SETTINGS.language,
    country: partial?.country ?? DEFAULT_GOOGLE_NEWS_SETTINGS.country,
    defaultSearchQuery:
      partial?.defaultSearchQuery ?? DEFAULT_GOOGLE_NEWS_SETTINGS.defaultSearchQuery,
    maxArticles: partial?.maxArticles ?? DEFAULT_GOOGLE_NEWS_SETTINGS.maxArticles,
    refreshInterval: partial?.refreshInterval ?? DEFAULT_GOOGLE_NEWS_SETTINGS.refreshInterval,
  }
}

function mergeHackerNews(partial?: Partial<HackerNewsSettings>): HackerNewsSettings {
  return {
    category: partial?.category ?? DEFAULT_HACKER_NEWS_SETTINGS.category,
    maxStories: partial?.maxStories ?? DEFAULT_HACKER_NEWS_SETTINGS.maxStories,
    refreshInterval: partial?.refreshInterval ?? DEFAULT_HACKER_NEWS_SETTINGS.refreshInterval,
  }
}

function mergeRssDefaults(partial?: Partial<RssDefaultsSettings>): RssDefaultsSettings {
  return {
    defaultRefreshInterval:
      partial?.defaultRefreshInterval ?? DEFAULT_RSS_SETTINGS.defaultRefreshInterval,
    maxArticlesPerSync: partial?.maxArticlesPerSync ?? DEFAULT_RSS_SETTINGS.maxArticlesPerSync,
    duplicateDetectionMode:
      partial?.duplicateDetectionMode ?? DEFAULT_RSS_SETTINGS.duplicateDetectionMode,
    trustScoreDefault: partial?.trustScoreDefault ?? DEFAULT_RSS_SETTINGS.trustScoreDefault,
  }
}

export interface ResolvedConnectorSettings {
  googleNews: GoogleNewsSettings
  hackerNews: HackerNewsSettings
  rss: RssDefaultsSettings
}

export async function getConnectorSettings(): Promise<ResolvedConnectorSettings> {
  const settings = readStoredPayload()

  return {
    googleNews: mergeGoogleNews(settings.google_news),
    hackerNews: mergeHackerNews(settings.hacker_news),
    rss: mergeRssDefaults(settings.rss),
  }
}

async function upsertSettings(patch: UserConnectorSettingsPayload): Promise<void> {
  const current = await getConnectorSettings()

  const merged: UserConnectorSettingsPayload = {
    google_news: {
      ...current.googleNews,
      ...patch.google_news,
    },
    hacker_news: {
      ...current.hackerNews,
      ...patch.hacker_news,
    },
    rss: {
      ...current.rss,
      ...patch.rss,
    },
  }

  writeStoredPayload(merged)
}

export async function updateGoogleNewsSettings(
  settings: Partial<GoogleNewsSettings>,
): Promise<ResolvedConnectorSettings> {
  await upsertSettings({ google_news: settings })
  return getConnectorSettings()
}

export async function updateHackerNewsSettings(
  settings: Partial<HackerNewsSettings>,
): Promise<ResolvedConnectorSettings> {
  await upsertSettings({ hacker_news: settings })
  return getConnectorSettings()
}

export async function updateRssDefaults(
  settings: Partial<RssDefaultsSettings>,
): Promise<ResolvedConnectorSettings> {
  await upsertSettings({ rss: settings })
  return getConnectorSettings()
}

export async function getDefaultSourceValuesFromSettings(): Promise<{
  updateInterval: string
  trustScore: number
  maxArticles: number
}> {
  const settings = await getConnectorSettings()

  return {
    updateInterval: settings.rss.defaultRefreshInterval,
    trustScore: settings.rss.trustScoreDefault,
    maxArticles: settings.rss.maxArticlesPerSync,
  }
}

export {
  DEFAULT_GOOGLE_NEWS_SETTINGS,
  DEFAULT_HACKER_NEWS_SETTINGS,
  DEFAULT_RSS_SETTINGS,
}
