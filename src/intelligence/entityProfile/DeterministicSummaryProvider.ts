import type { EntitySummaryProvider } from '@/types/entityProfile'
import type { EntityIntelligenceProfile } from '@/types/entityProfile'

export class DeterministicSummaryProvider implements EntitySummaryProvider {
  generateSummary(profile: EntityIntelligenceProfile): string {
    const name = profile.displayText
    const articles = profile.totalArticles
    const clusters = profile.totalClusters

    const topicParts = profile.relatedEntities
      .slice(0, 3)
      .map((entity) => entity.displayText)

    const topicSentence =
      topicParts.length > 0
        ? `Most mentions are related to ${topicParts.join(', ')}.`
        : 'No dominant co-occurring topics have been identified yet.'

    const clusterSentence =
      clusters > 0
        ? `${name} appears in ${articles} intelligence article${articles === 1 ? '' : 's'} across ${clusters} intelligence cluster${clusters === 1 ? '' : 's'}.`
        : `${name} appears in ${articles} intelligence article${articles === 1 ? '' : 's'}.`

    return `${clusterSentence} ${topicSentence} Average confidence is ${profile.confidence}%.`
  }
}

export const deterministicSummaryProvider = new DeterministicSummaryProvider()
