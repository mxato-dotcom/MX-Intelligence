import type { IntelligenceConnector } from '@/intelligence/connector/IntelligenceConnector'
import type {
  ConnectorHealthResult,
  ConnectorPreviewResult,
  ConnectorValidationResult,
  IntelligenceItem,
} from '@/intelligence/types'
import { mapConnectorError } from '@/lib/connectorErrors'
import { getNormalizer } from '@/intelligence/normalizers/normalizerRegistry'
import { GoogleNewsNormalizer } from '@/intelligence/normalizers/GoogleNewsNormalizer'
import * as googleNewsService from '@/services/googleNewsService'
import type { ParsedRSSFeed } from '@/types/rss'
import type { Source } from '@/types/source'

export class GoogleNewsConnector implements IntelligenceConnector {
  readonly type = 'Google News'
  readonly implemented = true

  async validate(source: Source): Promise<ConnectorValidationResult> {
    try {
      const preview = await this.preview(source)
      if (!preview.success) {
        return { success: false, message: preview.error ?? 'Invalid Google News source' }
      }

      return {
        success: true,
        message: `Valid Google News feed with ${preview.downloaded} items.`,
      }
    } catch (error) {
      return { success: false, message: mapConnectorError(error, this.type) }
    }
  }

  async healthCheck(source: Source): Promise<ConnectorHealthResult> {
    const startedAt = performance.now()

    try {
      const feed = await googleNewsService.collectFeed(source)
      const latencyMs = Math.round(performance.now() - startedAt)
      const isHealthy = source.active && source.status === 'enabled' && feed.items.length > 0

      return {
        success: isHealthy,
        status: isHealthy ? 'healthy' : 'degraded',
        message: `Google News returned ${feed.items.length} items.`,
        latencyMs,
      }
    } catch (error) {
      return {
        success: false,
        status: 'unhealthy',
        message: mapConnectorError(error, this.type),
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
        error: mapConnectorError(error, this.type),
        durationMs: Math.round(performance.now() - startedAt),
      }
    }
  }

  async collect(source: Source): Promise<IntelligenceItem[]> {
    const feed = await googleNewsService.collectFeed(source)
    return this.normalize(source, feed)
  }

  async normalize(source: Source, raw: unknown): Promise<IntelligenceItem[]> {
    const parsed = raw as ParsedRSSFeed
    const normalizer = getNormalizer<ParsedRSSFeed['items'][number]>('Google News')

    if (normalizer instanceof GoogleNewsNormalizer) {
      return normalizer.normalizeFeed(parsed, source)
    }

    return normalizer.normalizeMany(parsed.items, {
      source,
      connectorType: this.type,
      feedLanguage: parsed.language,
    })
  }
}

export const googleNewsConnector = new GoogleNewsConnector()
