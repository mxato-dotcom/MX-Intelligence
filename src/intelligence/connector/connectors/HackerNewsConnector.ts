import type { IntelligenceConnector } from '@/intelligence/connector/IntelligenceConnector'
import type {
  ConnectorHealthResult,
  ConnectorPreviewResult,
  ConnectorValidationResult,
  IntelligenceItem,
} from '@/intelligence/types'
import { mapConnectorError } from '@/lib/connectorErrors'
import { getHackerNewsFeed, parseConnectorConfig } from '@/lib/connectorConfig'
import { getNormalizer } from '@/intelligence/normalizers/normalizerRegistry'
import { HackerNewsNormalizer } from '@/intelligence/normalizers/HackerNewsNormalizer'
import * as connectorSettingsService from '@/services/connectorSettingsService'
import * as hackerNewsService from '@/services/hackerNewsService'
import type { HackerNewsItem } from '@/types/hackerNews'
import type { Source } from '@/types/source'

export class HackerNewsConnector implements IntelligenceConnector {
  readonly type = 'Hacker News'
  readonly implemented = true

  async validate(source: Source): Promise<ConnectorValidationResult> {
    try {
      const preview = await this.preview(source)
      if (!preview.success) {
        return { success: false, message: preview.error ?? 'Invalid Hacker News source' }
      }

      return {
        success: true,
        message: `Valid Hacker News source with ${preview.downloaded} stories.`,
      }
    } catch (error) {
      return { success: false, message: mapConnectorError(error, this.type) }
    }
  }

  async healthCheck(source: Source): Promise<ConnectorHealthResult> {
    const startedAt = performance.now()

    try {
      const config = parseConnectorConfig(source)
      const feed = getHackerNewsFeed(config)
      const stories = await hackerNewsService.collectStories(feed)
      const latencyMs = Math.round(performance.now() - startedAt)
      const isHealthy = source.active && source.status === 'enabled' && stories.length > 0

      return {
        success: isHealthy,
        status: isHealthy ? 'healthy' : 'degraded',
        message: `Hacker News returned ${stories.length} stories.`,
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
    const config = parseConnectorConfig(source)
    const feed = getHackerNewsFeed(config)
    const query = config.query?.trim()
    const settings = await connectorSettingsService.getConnectorSettings()
    const stories = await hackerNewsService.collectStories(
      feed,
      settings.hackerNews.maxStories,
      query,
    )
    return this.normalize(source, stories)
  }

  async normalize(source: Source, raw: unknown): Promise<IntelligenceItem[]> {
    const stories = raw as HackerNewsItem[]
    const normalizer = getNormalizer<HackerNewsItem>('Hacker News')

    if (normalizer instanceof HackerNewsNormalizer) {
      return normalizer.normalizeMany(stories, {
        source,
        connectorType: this.type,
      })
    }

    return normalizer.normalizeMany(stories, {
      source,
      connectorType: this.type,
    })
  }
}

export const hackerNewsConnector = new HackerNewsConnector()
