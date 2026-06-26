import type { Normalizer } from '@/intelligence/normalizers/Normalizer'
import { PlaceholderNormalizer } from '@/intelligence/normalizers/placeholders'
import { customApiNormalizer } from '@/intelligence/normalizers/CustomApiNormalizer'
import { devToNormalizer } from '@/intelligence/normalizers/DevToNormalizer'
import { githubNormalizer } from '@/intelligence/normalizers/GitHubNormalizer'
import { googleNewsNormalizer } from '@/intelligence/normalizers/GoogleNewsNormalizer'
import { hackerNewsNormalizer } from '@/intelligence/normalizers/HackerNewsNormalizer'
import { mediumNormalizer } from '@/intelligence/normalizers/MediumNormalizer'
import { newsApiNormalizer } from '@/intelligence/normalizers/NewsAPINormalizer'
import { redditNormalizer } from '@/intelligence/normalizers/RedditNormalizer'
import { twitterNormalizer } from '@/intelligence/normalizers/TwitterNormalizer'
import { youtubeNormalizer } from '@/intelligence/normalizers/YouTubeNormalizer'
import { rssNormalizer } from '@/intelligence/normalizers/RSSNormalizer'

const normalizerRegistry = new Map<string, Normalizer<unknown>>()

const TYPE_ALIASES: Record<string, string> = {
  rss: 'RSS',
  youtube: 'YouTube',
  reddit: 'Reddit',
  x: 'Twitter',
  twitter: 'Twitter',
  github: 'GitHub',
  'google news': 'Google News',
  medium: 'Medium',
  'hacker news': 'Hacker News',
  'dev.to': 'Dev.to',
  devto: 'Dev.to',
  newsapi: 'NewsAPI',
  'news api': 'NewsAPI',
  'custom api': 'Custom API',
}

function resolveNormalizerKey(type: string): string {
  const trimmed = type.trim()
  const alias = TYPE_ALIASES[trimmed.toLowerCase()]
  if (alias) {
    return alias
  }
  return trimmed
}

export function registerNormalizer<TInput>(normalizer: Normalizer<TInput>, aliases: string[] = []): void {
  normalizerRegistry.set(normalizer.type, normalizer as Normalizer<unknown>)

  for (const alias of aliases) {
    normalizerRegistry.set(alias, normalizer as Normalizer<unknown>)
  }
}

export function getNormalizer<TInput = unknown>(type: string): Normalizer<TInput> {
  const resolvedKey = resolveNormalizerKey(type)
  const normalizer = normalizerRegistry.get(resolvedKey)

  if (!normalizer) {
    return new PlaceholderNormalizer<TInput>(resolvedKey || type.trim() || 'Unknown')
  }

  return normalizer as Normalizer<TInput>
}

export function getSupportedNormalizers(): string[] {
  const uniqueTypes = new Set<string>()

  for (const normalizer of normalizerRegistry.values()) {
    uniqueTypes.add(normalizer.type)
  }

  return [...uniqueTypes].sort()
}

function bootstrapNormalizers(): void {
  registerNormalizer(rssNormalizer, ['rss'])
  registerNormalizer(youtubeNormalizer, ['youtube'])
  registerNormalizer(redditNormalizer, ['reddit'])
  registerNormalizer(twitterNormalizer, ['x', 'twitter'])
  registerNormalizer(githubNormalizer, ['github'])
  registerNormalizer(googleNewsNormalizer, ['google news'])
  registerNormalizer(mediumNormalizer, ['medium'])
  registerNormalizer(devToNormalizer, ['dev.to', 'devto'])
  registerNormalizer(hackerNewsNormalizer, ['hacker news'])
  registerNormalizer(newsApiNormalizer, ['newsapi', 'news api'])
  registerNormalizer(customApiNormalizer, ['custom api'])
}

bootstrapNormalizers()
