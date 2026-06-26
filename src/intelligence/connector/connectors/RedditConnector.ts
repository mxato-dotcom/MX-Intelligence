import type { IntelligenceConnector } from '@/intelligence/connector/IntelligenceConnector'
import type {
  ConnectorHealthResult,
  ConnectorPreviewResult,
  ConnectorValidationResult,
  IntelligenceItem,
} from '@/intelligence/types'
import { mapConnectorError } from '@/lib/connectorErrors'
import {
  getRedditSearchQuery,
  getRedditSort,
  getRedditTarget,
  parseConnectorConfig,
} from '@/lib/connectorConfig'
import { getNormalizer } from '@/intelligence/normalizers/normalizerRegistry'
import { RedditNormalizer } from '@/intelligence/normalizers/RedditNormalizer'
import * as redditService from '@/services/redditService'
import type { RedditPost } from '@/types/reddit'
import type { Source } from '@/types/source'

export class RedditConnector implements IntelligenceConnector {
  readonly type = 'Reddit'
  readonly implemented = true

  async validate(source: Source): Promise<ConnectorValidationResult> {
    try {
      const preview = await this.preview(source)
      if (!preview.success) {
        return { success: false, message: preview.error ?? 'Invalid Reddit source' }
      }

      return {
        success: true,
        message: `Valid Reddit source with ${preview.downloaded} posts.`,
      }
    } catch (error) {
      return { success: false, message: mapConnectorError(error, this.type) }
    }
  }

  async healthCheck(source: Source): Promise<ConnectorHealthResult> {
    const startedAt = performance.now()

    try {
      const config = parseConnectorConfig(source)
      const posts = await redditService.fetchPosts({
        subreddit: getRedditTarget(source, config),
        sort: getRedditSort(config),
        query: getRedditSearchQuery(config, source),
      })
      const latencyMs = Math.round(performance.now() - startedAt)
      const isHealthy = source.active && source.status === 'enabled' && posts.length > 0

      return {
        success: isHealthy,
        status: isHealthy ? 'healthy' : 'degraded',
        message: `Reddit returned ${posts.length} posts.`,
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
    const posts = await redditService.fetchPosts({
      subreddit: getRedditTarget(source, config),
      sort: getRedditSort(config),
      query: getRedditSearchQuery(config, source),
    })
    return this.normalize(source, posts)
  }

  async normalize(source: Source, raw: unknown): Promise<IntelligenceItem[]> {
    const posts = raw as RedditPost[]
    const normalizer = getNormalizer<RedditPost>('Reddit')

    if (normalizer instanceof RedditNormalizer) {
      return normalizer.normalizeMany(posts, {
        source,
        connectorType: this.type,
      })
    }

    return normalizer.normalizeMany(posts, {
      source,
      connectorType: this.type,
    })
  }
}

export const redditConnector = new RedditConnector()
