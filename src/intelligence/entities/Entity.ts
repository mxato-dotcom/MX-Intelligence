import type { EntityType } from '@/intelligence/entities/EntityType'

export interface Entity {
  id: string
  type: EntityType
  text: string
  normalizedValue: string
  confidence: number
  position: number
}

export interface ArticleEntityRecord {
  id: string
  article_id: string
  entity_type: EntityType
  entity_text: string
  normalized_text: string
  confidence: number
  created_at: string
}

export interface GroupedArticleEntities {
  type: EntityType
  entities: ArticleEntityRecord[]
}
