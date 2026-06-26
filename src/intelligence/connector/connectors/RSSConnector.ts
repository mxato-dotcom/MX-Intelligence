import type { IntelligenceConnector } from '@/intelligence/connector/IntelligenceConnector'
import type {
  ConnectorHealthResult,
  ConnectorPreviewResult,
  ConnectorValidationResult,
  IntelligenceItem,
} from '@/intelligence/types'
import { mapRssError } from '@/lib/rssErrors'
import { getNormalizer } from '@/intelligence/normalizers/normalizerRegistry'
import { RSSNormalizer } from '@/intelligence/normalizers/RSSNormalizer'
import * as rssService from '@/services/rssService'
import type { ParsedRSSFeed } from '@/types/rss'
import type { Source } from '@/types/source'

export class RSSConnector implements IntelligenceConnector {
  readonly type = 'RSS'
  readonly implemented = true

  async validate(source: Source): Promise<ConnectorValidationResult> {
    try {
      const preview = await this.preview(source)
      if (!preview.success) {
        return { success: false, message: preview.error ?? 'Invalid RSS feed' }
      }

      return {
        success: true,
        message: `Valid RSS feed with ${preview.downloaded} items.`,
      }
    } catch (error) {
      return { success: false, message: mapRssError(error) }
    }
  }

  async healthCheck(source: Source): Promise<ConnectorHealthResult> {
    const startedAt = performance.now()

    try {
      await rssService.fetchFeed(source.url)
      const latencyMs = Math.round(performance.now() - startedAt)
      const isHealthy = source.active && source.status === 'enabled'

      return {
        success: isHealthy,
        status: isHealthy ? 'healthy' : 'degraded',
        message: 'RSS feed is reachable.',
        latencyMs,
      }
    } catch (error) {
      return {
        success: false,
        status: 'unhealthy',
        message: mapRssError(error),
        latencyMs: Math.round(performance.now() - startedAt),
      }
    }
  }

  async preview(source: Source): Promise<ConnectorPreviewResult> {
    const startedAt = performance.now()

    try {
      const items = await this.collect(source)

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

  async collect(source: Source): Promise<IntelligenceItem[]> {
    const xml = await rssService.fetchFeed(source.url)
    const parsed = rssService.parseFeed(xml)
    return this.normalize(source, parsed)
  }

  async normalize(source: Source, raw: unknown): Promise<IntelligenceItem[]> {
    const parsed = raw as ParsedRSSFeed
    const normalizer = getNormalizer<ParsedRSSFeed['items'][number]>('RSS')

    if (normalizer instanceof RSSNormalizer) {
      return normalizer.normalizeFeed(parsed, source)
    }

    return normalizer.normalizeMany(parsed.items, {
      source,
      connectorType: this.type,
      feedLanguage: parsed.language,
    })
  }
}

export const rssConnector = new RSSConnector()
