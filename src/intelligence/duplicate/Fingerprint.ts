import { computeContentHash } from '@/lib/hash'
import { safeString, safeTrim } from '@/lib/safeString'

export interface FingerprintInput {
  title: string
  url: string
  publishedAt: string
}

export interface ArticleFingerprint {
  normalizedTitle: string
  normalizedUrl: string
  publishedDateKey: string
  fingerprint: string
  contentHash: string
  providerIdKey: string | null
}

const TRACKING_QUERY_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  'ref',
  'source',
  'spm',
]

export function normalizeText(value: string | null | undefined): string {
  return safeTrim(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildNormalizedTitle(title: string | null | undefined): string {
  return normalizeText(title)
}

export function normalizePublishedDate(publishedAt: string | null | undefined): string {
  const value = safeTrim(publishedAt)
  if (!value) {
    return ''
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value.toLowerCase()
  }

  return parsed.toISOString()
}

export function normalizeUrl(url: string | null | undefined): string {
  const trimmed = safeTrim(url)
  if (!trimmed) {
    return ''
  }

  try {
    const parsed = new URL(trimmed)
    for (const param of TRACKING_QUERY_PARAMS) {
      parsed.searchParams.delete(param)
    }

    parsed.hash = ''
    const pathname = parsed.pathname.replace(/\/+$/, '') || '/'
    const search = parsed.search

    return `${parsed.protocol}//${parsed.host.toLowerCase()}${pathname}${search}`.toLowerCase()
  } catch {
    return trimmed.toLowerCase()
  }
}

export async function buildFingerprint(input: FingerprintInput): Promise<ArticleFingerprint> {
  const normalizedTitle = buildNormalizedTitle(input.title)
  const normalizedUrl = normalizeUrl(input.url)
  const publishedDateKey = normalizePublishedDate(input.publishedAt)

  const fingerprint = await computeContentHash(
    `${normalizedTitle}::${normalizedUrl}::${publishedDateKey}`,
  )

  return {
    normalizedTitle,
    normalizedUrl,
    publishedDateKey,
    fingerprint,
    contentHash: '',
    providerIdKey: null,
  }
}

export function buildProviderIdKey(connectorType: string, providerId: string): string {
  return `${connectorType}::${safeTrim(providerId)}`
}

export async function buildContentHashFromText(text: string): Promise<string> {
  const normalized = normalizeText(text).slice(0, 2000)
  if (!normalized) {
    return ''
  }
  return computeContentHash(normalized)
}

export async function buildFingerprintFromItem(item: {
  id?: string
  connectorType?: string
  title: string
  url: string
  publishedAt: string
  summary?: string
  content?: string
}): Promise<ArticleFingerprint> {
  const base = await buildFingerprint({
    title: safeString(item.title),
    url: safeString(item.url),
    publishedAt: safeString(item.publishedAt),
  })

  const body = safeTrim(item.content) || safeTrim(item.summary)
  const contentHash = body ? await buildContentHashFromText(body) : ''

  return {
    ...base,
    contentHash,
    providerIdKey:
      item.id && item.connectorType
        ? buildProviderIdKey(item.connectorType, item.id)
        : null,
  }
}
