import { entityExtractor } from '@/intelligence/entities/EntityExtractor'
import type { Entity } from '@/intelligence/entities/Entity'
import * as articleService from '@/services/articleService'
import * as entityService from '@/services/entityService'

export interface BackfillStats {
  totalArticles: number
  articlesWithEntities: number
  articlesPendingBackfill: number
  totalEntities: number
}

export interface BackfillArticleResult {
  entitiesExtracted: number
  duplicatesSkipped: number
  failed: boolean
}

export interface BackfillRunResult {
  articlesProcessed: number
  entitiesExtracted: number
  duplicatesSkipped: number
  failed: number
}

function mapEntitiesForInsert(entities: Entity[]): Array<{
  entity_type: Entity['type']
  entity_text: string
  normalized_text: string
  confidence: number
}> {
  return entities.map((entity) => ({
    entity_type: entity.type,
    entity_text: entity.text,
    normalized_text: entity.normalizedValue.toLowerCase(),
    confidence: entity.confidence,
  }))
}

export async function backfillArticle(articleId: string): Promise<BackfillArticleResult> {
  try {
    const article = await articleService.getArticleById(articleId)
    if (!article) {
      return { entitiesExtracted: 0, duplicatesSkipped: 0, failed: true }
    }

    const entities = entityExtractor.extractEntities(article)
    const { inserted, skippedDuplicates } = await entityService.insertNewEntitiesOnly(
      article.id,
      mapEntitiesForInsert(entities),
    )

    return {
      entitiesExtracted: inserted,
      duplicatesSkipped: skippedDuplicates,
      failed: false,
    }
  } catch {
    return { entitiesExtracted: 0, duplicatesSkipped: 0, failed: true }
  }
}

export async function backfillAllArticles(): Promise<BackfillRunResult> {
  const articles = await articleService.getArticles()

  let articlesProcessed = 0
  let entitiesExtracted = 0
  let duplicatesSkipped = 0
  let failed = 0

  for (const article of articles) {
    const result = await backfillArticle(article.id)

    if (result.failed) {
      failed += 1
      continue
    }

    articlesProcessed += 1
    entitiesExtracted += result.entitiesExtracted
    duplicatesSkipped += result.duplicatesSkipped
  }

  return {
    articlesProcessed,
    entitiesExtracted,
    duplicatesSkipped,
    failed,
  }
}

export async function getBackfillStats(): Promise<BackfillStats> {
  const [articles, articlesWithEntities, totalEntities] = await Promise.all([
    articleService.getArticles(),
    entityService.countArticlesWithEntities(),
    entityService.getTotalEntityCount(),
  ])

  const totalArticles = articles.length
  const pending = Math.max(0, totalArticles - articlesWithEntities)

  return {
    totalArticles,
    articlesWithEntities,
    articlesPendingBackfill: pending,
    totalEntities,
  }
}
