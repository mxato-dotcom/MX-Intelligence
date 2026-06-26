import type { IntelligenceConnector } from '@/intelligence/connector/IntelligenceConnector'
import type {
  ConnectorHealthResult,
  ConnectorPreviewResult,
  ConnectorValidationResult,
  IntelligenceItem,
} from '@/intelligence/types'
import { mapConnectorError } from '@/lib/connectorErrors'
import { getNormalizer } from '@/intelligence/normalizers/normalizerRegistry'
import { NewsAPINormalizer } from '@/intelligence/normalizers/NewsAPINormalizer'
import * as newsApiService from '@/services/newsApiService'
import type { NewsAPIArticle } from '@/types/newsapi'
import type { Source } from '@/types/source'

export class NewsAPIConnector implements IntelligenceConnector {
  readonly type = 'NewsAPI'
  readonly implemented = true

  async validate(source: Source): Promise<ConnectorValidationResult> {
    try {
      const preview = await this.preview(source)
      if (!preview.success) {
        return { success: false, message: preview.error ?? 'Invalid NewsAPI source' }
      }

      return {
        success: true,
        message: `Valid NewsAPI source with ${preview.downloaded} articles.`,
      }
    } catch (error) {
      return { success: false, message: mapConnectorError(error, this.type) }
    }
  }

  async healthCheck(source: Source): Promise<ConnectorHealthResult> {
    const startedAt = performance.now()

    try {
      const articles = await newsApiService.fetchArticles(source)
      const latencyMs = Math.round(performance.now() - startedAt)
      const isHealthy = source.active && source.status === 'enabled' && articles.length > 0

      return {
        success: isHealthy,
        status: isHealthy ? 'healthy' : 'degraded',
        message: `NewsAPI returned ${articles.length} articles.`,
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
    const articles = await newsApiService.fetchArticles(source)
    return this.normalize(source, articles)
  }

  async normalize(source: Source, raw: unknown): Promise<IntelligenceItem[]> {
    const articles = raw as NewsAPIArticle[]
    const normalizer = getNormalizer<NewsAPIArticle>('NewsAPI')

    if (normalizer instanceof NewsAPINormalizer) {
      return normalizer.normalizeMany(articles, {
        source,
        connectorType: this.type,
      })
    }

    return normalizer.normalizeMany(articles, {
      source,
      connectorType: this.type,
    })
  }
}

export const newsApiConnector = new NewsAPIConnector()
