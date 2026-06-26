import type { Article } from '@/types/article'
import type { IntelligenceItem } from '@/intelligence/types/IntelligenceItem'
import type { Entity } from '@/intelligence/entities/Entity'
import type { ExtractionResult } from '@/intelligence/entities/ExtractionResult'
import { mergeExtractionResults } from '@/intelligence/entities/ExtractionResult'
import type { EntityExtractorProvider } from '@/intelligence/entities/RuleBasedExtractor'
import { ruleBasedExtractor } from '@/intelligence/entities/RuleBasedExtractor'

export interface EntityExtractor {
  extractFromText(text: string): ExtractionResult
  extractFromArticle(article: Article): ExtractionResult
  extractFromIntelligenceItem(item: IntelligenceItem): ExtractionResult
  extractEntities(article: Article): Entity[]
}

export class DefaultEntityExtractor implements EntityExtractor {
  constructor(private readonly provider: EntityExtractorProvider = ruleBasedExtractor) {}

  extractFromText(text: string): ExtractionResult {
    return this.provider.extractFromText(text)
  }

  extractFromArticle(article: Article): ExtractionResult {
    return this.provider.extractFromArticle(article)
  }

  extractFromIntelligenceItem(item: IntelligenceItem): ExtractionResult {
    return this.provider.extractFromIntelligenceItem(item)
  }

  extractEntities(article: Article): Entity[] {
    return this.extractFromArticle(article).entities
  }

  extractMerged(item: IntelligenceItem, article?: Article): ExtractionResult {
    const itemResult = this.provider.extractFromIntelligenceItem(item)
    if (!article) {
      return itemResult
    }

    return mergeExtractionResults([
      itemResult,
      this.provider.extractFromArticle(article),
    ])
  }
}

export const entityExtractor = new DefaultEntityExtractor()
