import { buildIntelligenceItem } from '@/intelligence/normalizers/buildIntelligenceItem'
import type { Normalizer, NormalizerContext } from '@/intelligence/normalizers/Normalizer'
import type { IntelligenceItem } from '@/intelligence/types/IntelligenceItem'
import type { ParsedRSSFeed, ParsedRSSItem } from '@/types/rss'
import type { Source } from '@/types/source'

export class GoogleNewsNormalizer implements Normalizer<ParsedRSSItem> {
  readonly type = 'Google News'

  async normalizeFeed(parsed: ParsedRSSFeed, source: Source): Promise<IntelligenceItem[]> {
    const context: NormalizerContext = {
      source,
      connectorType: this.type,
      feedLanguage: parsed.language,
    }

    return this.normalizeMany(parsed.items, context)
  }

  async normalize(item: ParsedRSSItem, context: NormalizerContext): Promise<IntelligenceItem> {
    return buildIntelligenceItem(context, {
      title: item.title,
      url: item.url,
      summary: item.summary,
      content: item.content,
      imageUrl: item.image ?? undefined,
      author: item.author ?? undefined,
      publishedAt: item.published_at,
      language: item.language ?? context.feedLanguage ?? undefined,
      rawData: item,
    })
  }

  async normalizeMany(items: ParsedRSSItem[], context: NormalizerContext): Promise<IntelligenceItem[]> {
    return Promise.all(items.map((item) => this.normalize(item, context)))
  }
}

export const googleNewsNormalizer = new GoogleNewsNormalizer()
