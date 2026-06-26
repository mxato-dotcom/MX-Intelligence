import { safeTrim } from '@/lib/safeString'
import { buildIntelligenceItem } from '@/intelligence/normalizers/buildIntelligenceItem'
import type { Normalizer, NormalizerContext } from '@/intelligence/normalizers/Normalizer'
import type { IntelligenceItem } from '@/intelligence/types/IntelligenceItem'
import type { NewsAPIArticle } from '@/types/newsapi'

export class NewsAPINormalizer implements Normalizer<NewsAPIArticle> {
  readonly type = 'NewsAPI'

  async normalize(article: NewsAPIArticle, context: NormalizerContext): Promise<IntelligenceItem> {
    const title = safeTrim(article.title) || 'Untitled'
    const url = safeTrim(article.url)
    const summary = safeTrim(article.description ?? '')
    const content = safeTrim(article.content ?? '') || summary
    const author = safeTrim(article.author ?? article.source?.name ?? '')
    const publishedAt = article.publishedAt || new Date().toISOString()

    return buildIntelligenceItem(context, {
      title,
      url,
      summary,
      content,
      imageUrl: article.urlToImage ?? undefined,
      author: author || undefined,
      publishedAt,
      rawData: article,
    })
  }

  async normalizeMany(articles: NewsAPIArticle[], context: NormalizerContext): Promise<IntelligenceItem[]> {
    const valid = articles.filter((article) => safeTrim(article.url))
    return Promise.all(valid.map((article) => this.normalize(article, context)))
  }
}

export const newsApiNormalizer = new NewsAPINormalizer()
