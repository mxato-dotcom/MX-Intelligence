import type {
  CollectorContext,
  ConnectResult,
  FetchResult,
  HealthCheckResult,
  RawCollectorItem,
  ValidationResult,
} from '@/collectors/types'
import { mapRssError } from '@/lib/rssErrors'
import * as rssService from '@/services/rssService'
import { BaseCollector } from '@/collectors/base/BaseCollector'

export class RSSCollector extends BaseCollector {
  readonly type = 'RSS'

  async connect(context: CollectorContext): Promise<ConnectResult> {
    return {
      success: true,
      message: `Ready to collect RSS feed from "${context.source.name}".`,
    }
  }

  async validate(context: CollectorContext): Promise<ValidationResult> {
    try {
      const preview = await rssService.previewFeed(context.source)
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

  async fetch(context: CollectorContext): Promise<FetchResult> {
    try {
      const xml = await rssService.fetchFeed(context.source.url)
      const parsed = rssService.parseFeed(xml)

      const items: RawCollectorItem[] = parsed.items.map((item) => ({
        id: item.external_id ?? item.url,
        title: item.title,
        url: item.url,
        publishedAt: item.published_at,
        raw: { ...item },
      }))

      return {
        success: true,
        items,
        message: `Downloaded ${items.length} RSS items.`,
      }
    } catch (error) {
      return {
        success: false,
        items: [],
        message: mapRssError(error),
      }
    }
  }

  async normalize(items: RawCollectorItem[], context: CollectorContext) {
    const parsed = {
      title: context.source.name,
      language: null,
      items: items.map((item) => ({
        title: item.title,
        url: item.url,
        summary: String(item.raw.summary ?? ''),
        content: String(item.raw.content ?? item.raw.summary ?? ''),
        image: (item.raw.image as string | null) ?? null,
        author: (item.raw.author as string | null) ?? null,
        published_at: item.publishedAt,
        language: (item.raw.language as string | null) ?? null,
        external_id: (item.raw.external_id as string | null) ?? item.id,
      })),
    }

    return rssService.normalizeFeed(parsed, context.source).then((articles) =>
      articles.map((item) => ({
        title: item.title,
        url: item.url,
        summary: item.summary,
        category: item.category,
        publishedAt: item.published_at,
        sourceType: this.type,
      })),
    )
  }

  async healthCheck(context: CollectorContext): Promise<HealthCheckResult> {
    const startedAt = performance.now()

    try {
      await rssService.fetchFeed(context.source.url)
      const latencyMs = Math.round(performance.now() - startedAt)
      const isHealthy = context.source.active && context.source.status === 'enabled'

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
}
