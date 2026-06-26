import { computeArticleHash } from '@/lib/hash'
import { safeSlice, safeStringOr, safeTrim } from '@/lib/safeString'
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
    const title = safeStringOr(item.title, 'Untitled')
    const url = safeTrim(item.url)
    const summary = safeTrim(item.summary) || safeSlice(item.content, 0, 280)
    const content = safeTrim(item.content) || summary
    const category = safeStringOr(source.category, 'Uncategorized')
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
