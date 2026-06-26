import { XMLParser } from 'fast-xml-parser'
import { importIntelligenceItems } from '@/intelligence/import/ImportEngine'
import { getNormalizer } from '@/intelligence/normalizers/normalizerRegistry'
import { RSSNormalizer } from '@/intelligence/normalizers/RSSNormalizer'
import type { IntelligenceItem } from '@/intelligence/types/IntelligenceItem'
import { mapRssError } from '@/lib/rssErrors'
import { supabase } from '@/lib/supabase'
import * as sourceService from '@/services/sourceService'
import type {
  FeedImportOptions,
  FeedImportResult,
  FeedPreviewResult,
  ParsedRSSFeed,
} from '@/types/rss'
import type { Source } from '@/types/source'

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function textValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim()
  if (typeof value === 'object' && value !== null && '#text' in value) {
    return String((value as { '#text': unknown })['#text']).trim()
  }
  return ''
}

function parseDate(value: string): string {
  if (!value) return new Date().toISOString()
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString()
  return parsed.toISOString()
}

function extractImage(item: Record<string, unknown>): string | null {
  const enclosure = item.enclosure as Record<string, unknown> | undefined
  if (enclosure) {
    const type = textValue(enclosure['@_type'])
    const url = textValue(enclosure['@_url'])
    if (url && (type.includes('image') || !type)) return url
  }

  const mediaContent = item['media:content'] as Record<string, unknown> | undefined
  if (mediaContent) {
    const url = textValue(mediaContent['@_url'])
    if (url) return url
  }

  const mediaThumbnail = item['media:thumbnail'] as Record<string, unknown> | undefined
  if (mediaThumbnail) {
    const url = textValue(mediaThumbnail['@_url'])
    if (url) return url
  }

  return null
}

function mapRssItem(item: Record<string, unknown>, feedLanguage: string | null) {
  const title = textValue(item.title)
  const url =
    textValue(item.link) ||
    textValue(item.guid) ||
    textValue(item.id)

  if (!url) return null

  const contentEncoded = textValue(item['content:encoded'])
  const description = textValue(item.description)
  const content = contentEncoded || description
  const summary = description || contentEncoded.slice(0, 280)

  return {
    title: title || 'Untitled',
    url,
    summary,
    content,
    image: extractImage(item),
    author: textValue(item.author) || textValue(item['dc:creator']) || null,
    published_at: parseDate(
      textValue(item.pubDate) || textValue(item.published) || textValue(item.updated),
    ),
    language: textValue(item.language) || feedLanguage,
    external_id: textValue(item.guid) || textValue(item.id) || url,
  }
}

function mapAtomEntry(entry: Record<string, unknown>, feedLanguage: string | null) {
  const title = textValue(entry.title)
  const linkNode = entry.link as Record<string, unknown> | Record<string, unknown>[] | undefined
  let url = ''

  if (linkNode) {
    const links = asArray(linkNode)
    const alternate = links.find((link) => textValue(link['@_rel']) === 'alternate')
    url = textValue(alternate?.['@_href'] ?? links[0]?.['@_href'])
  }

  if (!url) {
    url = textValue(entry.id)
  }

  if (!url) return null

  const content = textValue(entry.content) || textValue(entry.summary)
  const summary = textValue(entry.summary) || content.slice(0, 280)

  const authorNode = entry.author as Record<string, unknown> | string | undefined
  const author =
    typeof authorNode === 'object' && authorNode !== null
      ? textValue(authorNode.name) || textValue(authorNode.email)
      : textValue(authorNode)

  return {
    title: title || 'Untitled',
    url,
    summary,
    content,
    image: extractImage(entry),
    author: author || textValue(entry['dc:creator']) || null,
    published_at: parseDate(
      textValue(entry.published) || textValue(entry.updated) || textValue(entry.pubDate),
    ),
    language: feedLanguage,
    external_id: textValue(entry.id) || url,
  }
}

export async function fetchFeed(url: string): Promise<string> {
  const trimmedUrl = url.trim()

  if (!trimmedUrl) {
    throw new Error('Invalid URL')
  }

  if (!isValidHttpUrl(trimmedUrl)) {
    throw new Error('Invalid URL')
  }

  const { data, error } = await supabase.functions.invoke('fetch-rss', {
    body: { url: trimmedUrl },
  })

  if (error) {
    throw new Error('Failed to fetch feed')
  }

  if (!data) {
    throw new Error('Failed to fetch feed')
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch feed')
  }

  if (!data.xml.trim()) {
    throw new Error('Empty feed')
  }

  return data.xml
}

export function parseFeed(xml: string): ParsedRSSFeed {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      trimValues: true,
      parseTagValue: false,
    })

    const document = parser.parse(xml) as Record<string, unknown>
    const rssChannel = document.rss as Record<string, unknown> | undefined
    const atomFeed = document.feed as Record<string, unknown> | undefined

    if (rssChannel?.channel) {
      const channel = rssChannel.channel as Record<string, unknown>
      const feedLanguage = textValue(channel.language) || null
      const items = asArray(channel.item as Record<string, unknown> | Record<string, unknown>[] | undefined)
        .map((item) => mapRssItem(item, feedLanguage))
        .filter((item): item is NonNullable<typeof item> => item !== null)

      if (items.length === 0) {
        throw new Error('Feed contains no items')
      }

      return {
        title: textValue(channel.title) || 'RSS Feed',
        language: feedLanguage,
        items,
      }
    }

    if (atomFeed) {
      const feedLanguage = textValue(atomFeed.language) || null
      const entries = asArray(atomFeed.entry as Record<string, unknown> | Record<string, unknown>[] | undefined)
        .map((entry) => mapAtomEntry(entry, feedLanguage))
        .filter((item): item is NonNullable<typeof item> => item !== null)

      if (entries.length === 0) {
        throw new Error('Feed contains no items')
      }

      return {
        title: textValue(atomFeed.title) || 'Atom Feed',
        language: feedLanguage,
        items: entries,
      }
    }

    throw new Error('Invalid RSS feed')
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(mapRssError(error))
    }
    throw new Error(mapRssError(error))
  }
}

export async function normalizeFeed(
  parsed: ParsedRSSFeed,
  source: Source,
): Promise<IntelligenceItem[]> {
  const normalizer = getNormalizer<ParsedRSSFeed['items'][number]>('RSS')

  if (normalizer instanceof RSSNormalizer) {
    return normalizer.normalizeFeed(parsed, source)
  }

  return normalizer.normalizeMany(parsed.items, {
    source,
    connectorType: 'RSS',
    feedLanguage: parsed.language,
  })
}

export async function collectFeedItems(source: Source): Promise<IntelligenceItem[]> {
  const xml = await fetchFeed(source.url)
  const parsed = parseFeed(xml)
  return normalizeFeed(parsed, source)
}

async function executeImport(
  source: Source,
  userId: string,
  items: IntelligenceItem[],
  selectedIds?: string[],
): Promise<FeedImportResult> {
  const startedAt = performance.now()
  const downloaded = items.length

  const selected = selectedIds && selectedIds.length > 0 ? new Set(selectedIds) : null
  const toImport = selected ? items.filter((item) => selected.has(item.id)) : items

  const importResult = await importIntelligenceItems(toImport, userId)

  await sourceService.updateSourceAfterImport(
    source.id,
    importResult.imported + importResult.updated,
  )

  return {
    downloaded,
    imported: importResult.imported,
    skipped: importResult.skipped,
    updated: importResult.updated,
    failed: importResult.failed,
    durationMs: Math.round(performance.now() - startedAt),
  }
}

export async function importArticlesFromFeed(
  source: Source,
  userId: string,
  selectedIds?: string[],
): Promise<FeedImportResult> {
  const items = await collectFeedItems(source)
  return executeImport(source, userId, items, selectedIds)
}

export async function previewFeed(source: Source): Promise<FeedPreviewResult> {
  const startedAt = performance.now()

  try {
    const items = await collectFeedItems(source)

    return {
      success: true,
      items,
      downloaded: items.length,
      durationMs: Math.round(performance.now() - startedAt),
    }
  } catch (error) {
    return {
      success: false,
      items: [],
      downloaded: 0,
      error: mapRssError(error),
      durationMs: Math.round(performance.now() - startedAt),
    }
  }
}

export async function importFeed(options: FeedImportOptions): Promise<FeedImportResult> {
  const { source, userId, selectedIds, items } = options

  if (items && items.length > 0) {
    return executeImport(source, userId, items, selectedIds)
  }

  return importArticlesFromFeed(source, userId, selectedIds)
}
