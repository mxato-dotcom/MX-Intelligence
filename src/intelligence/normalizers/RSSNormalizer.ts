import { computeArticleHash } from '@/lib/hash'
import type { NormalizedIntelligenceArticle } from '@/intelligence/types'
import type { ParsedRSSFeed, ParsedRSSItem } from '@/types/rss'
import type { Source } from '@/types/source'

export class RSSNormalizer {
  async normalize(parsed: ParsedRSSFeed, source: Source): Promise<NormalizedIntelligenceArticle[]> {
    const normalized: NormalizedIntelligenceArticle[] = []

    for (const item of parsed.items) {
      normalized.push(await this.normalizeItem(item, source, parsed.language))
    }

    return normalized
  }

  private async normalizeItem(
    item: ParsedRSSItem,
    source: Source,
    feedLanguage: string | null,
  ): Promise<NormalizedIntelligenceArticle> {
    const title = item.title.trim() || 'Untitled'
    const url = item.url.trim()
    const summary = item.summary.trim() || item.content.trim().slice(0, 280)
    const content = item.content.trim() || summary
    const category = source.category.trim() || 'Uncategorized'
    const hash = await computeArticleHash(url, title)

    return {
      title,
      summary,
      content,
      url,
      image: item.image,
      author: item.author,
      category,
      published_at: item.published_at,
      language: item.language ?? feedLanguage,
      source: source.name,
      external_id: item.external_id,
      hash,
    }
  }
}

export const rssNormalizer = new RSSNormalizer()
