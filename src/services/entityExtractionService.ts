import { entityExtractor } from '@/intelligence/entities/EntityExtractor'
import type { Entity } from '@/intelligence/entities/Entity'
import type { IntelligenceItem } from '@/intelligence/types/IntelligenceItem'
import * as articleService from '@/services/articleService'
import * as entityService from '@/services/entityService'
import type { Article } from '@/types/article'

export async function extractAndStoreForArticle(article: Article): Promise<Entity[]> {
  const entities = entityExtractor.extractEntities(article)

  await entityService.deleteEntitiesForArticle(article.id)
  await entityService.insertEntities(
    article.id,
    entities.map((entity) => ({
      entity_type: entity.type,
      entity_text: entity.text,
      normalized_text: entity.normalizedValue.toLowerCase(),
      confidence: entity.confidence,
    })),
  )

  return entities
}

export async function extractAndStoreFromItem(
  item: IntelligenceItem,
  article: Article,
): Promise<Entity[]> {
  const result = entityExtractor.extractMerged(item, article)

  await entityService.deleteEntitiesForArticle(article.id)
  await entityService.insertEntities(
    article.id,
    result.entities.map((entity) => ({
      entity_type: entity.type,
      entity_text: entity.text,
      normalized_text: entity.normalizedValue.toLowerCase(),
      confidence: entity.confidence,
    })),
  )

  return result.entities
}

export async function extractAndStoreForArticleIds(articleIds: string[]): Promise<void> {
  if (articleIds.length === 0) {
    return
  }

  for (const articleId of articleIds) {
    const article = await articleService.getArticleById(articleId)
    if (article) {
      await extractAndStoreForArticle(article)
    }
  }
}

export {
  findByEntity,
  findEntities,
  getTopEntities,
  getEntityDashboardStats,
  getSourceEntityStats,
  getEntitiesForArticle,
  groupEntitiesByType,
} from '@/services/entityService'
