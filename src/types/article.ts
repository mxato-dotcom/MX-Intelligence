export interface Article {
  id: string
  title: string
  source: string
  url: string
  content: string
  summary: string
  category: string
  published_at: string
  created_at: string
  created_by: string
}

export interface CreateArticleInput {
  title: string
  source: string
  url: string
  content: string
  summary: string
  category: string
}
