import { computeArticleHash } from '@/lib/hash'
import type { Normalizer, NormalizerContext } from '@/intelligence/normalizers/Normalizer'
import type { IntelligenceItem } from '@/intelligence/types/IntelligenceItem'
import type { ParsedRSSFeed, ParsedRSSItem } from '@/types/rss'
import type { Source } from '@/types/source'

export class RSSNormalizer implements Normalizer<ParsedRSSItem> {
  readonly type = 'RSS'

  async normalizeFeed(parsed: ParsedRSSFeed, source: Source): Promise<IntelligenceItem[]> {
    const context: NormalizerContext = {
      source,
      connectorType: this.type,
      feedLanguage: parsed.language,
    }

    return this.normalizeMany(parsed.items, context)
  }

  async normalize(item: ParsedRSSItem, context: NormalizerContext): Promise<IntelligenceItem> {
    const source = context.source
    const title = item.title.trim() || 'Untitled'
    const url = item.url.trim()
    const summary = item.summary.trim() || item.content.trim().slice(0, 280)
    const content = item.content.trim() || summary
    const category = source.category.trim() || 'Uncategorized'
    const id = await computeArticleHash(url, title)

    return {
      id,
      connectorType: context.connectorType,
      sourceId: source.id,
      sourceName: source.name,
      category,
      title,
      summary,
      content,
      url,
      imageUrl: item.image ?? undefined,
      author: item.author ?? undefined,
      publishedAt: item.published_at,
      language: item.language ?? context.feedLanguage ?? undefined,
      tags: [],
      trustScore: source.trust_score,
      rawData: item,
    }
  }

  async normalizeMany(items: ParsedRSSItem[], context: NormalizerContext): Promise<IntelligenceItem[]> {
    return Promise.all(items.map((item) => this.normalize(item, context)))
  }
}

export const rssNormalizer = new RSSNormalizer()
