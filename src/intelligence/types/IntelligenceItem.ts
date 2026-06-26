export interface IntelligenceItem {
  id: string
  connectorType: string
  sourceId: string
  sourceName: string
  category: string
  title: string
  summary: string
  content: string
  url: string
  imageUrl?: string
  author?: string
  publishedAt: string
  language?: string
  tags: string[]
  trustScore: number
  rawData: unknown
}
