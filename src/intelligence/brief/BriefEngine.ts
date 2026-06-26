import {
  generatedBriefToGenerationResult,
  type BriefGeneratorProvider,
} from '@/intelligence/brief/providers/BriefGeneratorProvider'
import { deterministicBriefGenerator } from '@/intelligence/brief/providers/DeterministicBriefGenerator'
import type { BriefGenerationResult, IntelligenceDailyBrief } from '@/intelligence/brief/BriefTypes'
import { trustScoreEngine } from '@/intelligence/scoring/TrustScoreEngine'
import * as articleService from '@/services/articleService'
import { getAggregatedEntities } from '@/services/entityService'
import { getFusionClusters, rebuildFusionClusters } from '@/services/fusionClusterService'
import * as sourceService from '@/services/sourceService'
import type { BriefGenerationInput } from '@/intelligence/brief/providers/BriefGeneratorProvider'

export class BriefEngine {
  constructor(private readonly generator: BriefGeneratorProvider = deterministicBriefGenerator) {}

  getProvider(): BriefGeneratorProvider {
    return this.generator
  }

  async buildGenerationInput(): Promise<BriefGenerationInput> {
    await rebuildFusionClusters()

    const [articles, clusters, entitySummaries, sources] = await Promise.all([
      articleService.getArticles(),
      Promise.resolve(getFusionClusters()),
      getAggregatedEntities({ limit: 50 }),
      sourceService.getSources(),
    ])

    const trustScores = sources.map((source) => {
      const profile = trustScoreEngine.calculateSourceScore(source)
      return {
        sourceId: source.id,
        sourceName: source.name,
        trustScore: profile.score,
        healthLabel: profile.health,
      }
    })

    return {
      articles,
      clusters,
      entities: entitySummaries.map((entity) => ({
        entityType: entity.entityType,
        displayText: entity.displayText,
        mentionCount: entity.mentionCount,
        articleCount: entity.articleCount,
      })),
      sources,
      trustScores,
    }
  }

  async buildGenerationResult(): Promise<BriefGenerationResult> {
    const input = await this.buildGenerationInput()
    const generated = await this.generator.generateBrief(input)
    return generatedBriefToGenerationResult(generated)
  }

  async generateBriefPreview(): Promise<BriefGenerationResult> {
    return this.buildGenerationResult()
  }
}

export const briefEngine = new BriefEngine()

export type { IntelligenceDailyBrief, BriefGenerationResult }
