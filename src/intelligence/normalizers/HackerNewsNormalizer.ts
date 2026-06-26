import { safeTrim } from '@/lib/safeString'
import { buildIntelligenceItem } from '@/intelligence/normalizers/buildIntelligenceItem'
import type { Normalizer, NormalizerContext } from '@/intelligence/normalizers/Normalizer'
import type { IntelligenceItem } from '@/intelligence/types/IntelligenceItem'
import type { HackerNewsItem } from '@/types/hackerNews'

function hackerNewsUrl(item: HackerNewsItem): string {
  const external = safeTrim(item.url)
  if (external) {
    return external
  }

  return `https://news.ycombinator.com/item?id=${item.id}`
}

export class HackerNewsNormalizer implements Normalizer<HackerNewsItem> {
  readonly type = 'Hacker News'

  async normalize(item: HackerNewsItem, context: NormalizerContext): Promise<IntelligenceItem> {
    const url = hackerNewsUrl(item)
    const text = safeTrim(item.text ?? '')
    const summary = text || `Score: ${item.score} · Comments: ${item.num_comments}`
    const content = text || summary
    const publishedAt = item.time
      ? new Date(item.time * 1000).toISOString()
      : new Date().toISOString()
    const tags = ['Hacker News']

    return buildIntelligenceItem(context, {
      title: item.title,
      url,
      summary,
      content,
      author: item.author,
      publishedAt,
      tags,
      rawData: item,
    })
  }

  async normalizeMany(items: HackerNewsItem[], context: NormalizerContext): Promise<IntelligenceItem[]> {
    return Promise.all(items.map((item) => this.normalize(item, context)))
  }
}

export const hackerNewsNormalizer = new HackerNewsNormalizer()
