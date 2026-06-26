import { deterministicBriefGenerator } from '@/intelligence/brief/BriefGenerator'
import type {
  BriefGenerationResult,
  BriefGeneratorProvider,
  IntelligenceDailyBrief,
} from '@/intelligence/brief/BriefTypes'
import * as articleService from '@/services/articleService'
import { getAggregatedEntities } from '@/services/entityService'
import { getFusionClusters, rebuildFusionClusters } from '@/services/fusionClusterService'

export class BriefEngine {
  constructor(private readonly generator: BriefGeneratorProvider = deterministicBriefGenerator) {}

  async buildGenerationResult(): Promise<BriefGenerationResult> {
    await rebuildFusionClusters()

    const [articles, clusters, entitySummaries] = await Promise.all([
      articleService.getArticles(),
      Promise.resolve(getFusionClusters()),
      getAggregatedEntities({ limit: 50 }),
    ])

    return this.generator.generate({
      articles,
      clusters,
      entitySummaries: entitySummaries.map((entity) => ({
        entityType: entity.entityType,
        displayText: entity.displayText,
        mentionCount: entity.mentionCount,
        articleCount: entity.articleCount,
      })),
    })
  }

  async generateBriefPreview(): Promise<BriefGenerationResult> {
    return this.buildGenerationResult()
  }
}

export const briefEngine = new BriefEngine()

export type { IntelligenceDailyBrief, BriefGenerationResult }
