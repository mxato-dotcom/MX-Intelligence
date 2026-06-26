export interface NewsAPIArticle {
  title: string
  description: string | null
  content: string | null
  url: string
  urlToImage?: string | null
  author?: string | null
  publishedAt: string
  source?: { name?: string | null; id?: string | null }
}

export interface NewsAPIFetchResult {
  articles: NewsAPIArticle[]
}
