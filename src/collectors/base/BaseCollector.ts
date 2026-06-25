import type {
  CollectorContext,
  ConnectResult,
  FetchResult,
  HealthCheckResult,
  HealthStatus,
  ICollector,
  NormalizedItem,
  RawCollectorItem,
  ValidationResult,
} from '@/collectors/types'

const MOCK_LATENCY_MS = 40

export abstract class BaseCollector implements ICollector {
  abstract readonly type: string

  protected async simulateWork(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS))
  }

  async connect(context: CollectorContext): Promise<ConnectResult> {
    await this.simulateWork()
    return {
      success: true,
      message: `Connected to ${this.type} source "${context.source.name}" (mock).`,
    }
  }

  async validate(context: CollectorContext): Promise<ValidationResult> {
    await this.simulateWork()

    if (!context.source.url.trim()) {
      return {
        success: false,
        message: 'Source URL is required.',
      }
    }

    return {
      success: true,
      message: `${this.type} source configuration is valid (mock).`,
    }
  }

  async fetch(context: CollectorContext): Promise<FetchResult> {
    await this.simulateWork()

    const items: RawCollectorItem[] = [
      {
        id: `${this.type}-mock-1`,
        title: `Mock ${this.type} item from ${context.source.name}`,
        url: context.source.url,
        publishedAt: new Date().toISOString(),
        raw: { mock: true, collector: this.type },
      },
      {
        id: `${this.type}-mock-2`,
        title: `Second mock ${this.type} entry`,
        url: context.source.url,
        publishedAt: new Date().toISOString(),
        raw: { mock: true, collector: this.type, index: 2 },
      },
    ]

    return {
      success: true,
      items,
      message: `Fetched ${items.length} mock items.`,
    }
  }

  async normalize(items: RawCollectorItem[], context: CollectorContext): Promise<NormalizedItem[]> {
    await this.simulateWork()

    return items.map((item) => ({
      title: item.title,
      url: item.url,
      summary: `Normalized mock content for ${item.title}`,
      category: context.source.category,
      publishedAt: item.publishedAt,
      sourceType: this.type,
    }))
  }

  async healthCheck(context: CollectorContext): Promise<HealthCheckResult> {
    await this.simulateWork()

    const status: HealthStatus =
      context.source.active && context.source.status === 'enabled' ? 'healthy' : 'degraded'

    return {
      success: status === 'healthy',
      status,
      message: `${this.type} collector health check passed (mock).`,
      latencyMs: MOCK_LATENCY_MS,
    }
  }
}
