import {
  calculateImportanceScore,
  calculateOverallConfidence,
  calculateRiskLevel,
  calculateSectionConfidence,
} from '@/intelligence/brief/BriefScoring'
import type { BriefSectionId } from '@/intelligence/brief/BriefTypes'
import type { IntelligenceCluster } from '@/intelligence/fusion/FusionCluster'
import type { EntityType } from '@/intelligence/entities/EntityType'
import type {
  BriefEntitySummary,
  BriefGenerationInput,
  BriefGeneratorProvider,
  GeneratedBrief,
  GeneratedBriefSection,
} from '@/intelligence/brief/providers/BriefGeneratorProvider'
import { safeStringOr, safeTrim } from '@/lib/safeString'
import type { Article } from '@/types/article'

interface SectionRule {
  id: BriefSectionId
  title: string
  keywords: string[]
  categories: string[]
  entityTypes: EntityType[]
}

const SECTION_RULES: SectionRule[] = [
  {
    id: 'key-events',
    title: 'Key Events',
    keywords: ['event', 'breaking', 'report', 'update', 'announcement'],
    categories: [],
    entityTypes: [],
  },
  {
    id: 'emerging-technologies',
    title: 'Emerging Technologies',
    keywords: ['technology', 'innovation', 'platform', 'software', 'hardware'],
    categories: ['Technology'],
    entityTypes: ['Technology', 'Software', 'Product'],
  },
  {
    id: 'cyber-security',
    title: 'Cyber Security',
    keywords: ['cyber', 'security', 'breach', 'hack', 'malware', 'vulnerability'],
    categories: ['Cybersecurity'],
    entityTypes: ['Organization'],
  },
  {
    id: 'ai',
    title: 'AI',
    keywords: ['ai', 'artificial intelligence', 'machine learning', 'llm', 'model'],
    categories: ['AI'],
    entityTypes: ['Technology', 'Company'],
  },
  {
    id: 'business',
    title: 'Business',
    keywords: ['business', 'market', 'finance', 'earnings', 'company', 'startup'],
    categories: ['Business', 'Finance'],
    entityTypes: ['Company', 'Organization', 'Stock'],
  },
  {
    id: 'crypto',
    title: 'Crypto',
    keywords: ['crypto', 'bitcoin', 'ethereum', 'blockchain', 'token'],
    categories: ['Crypto'],
    entityTypes: ['Cryptocurrency', 'Currency'],
  },
  {
    id: 'world-affairs',
    title: 'World Affairs',
    keywords: ['world', 'global', 'government', 'policy', 'international', 'war'],
    categories: ['Politics'],
    entityTypes: ['Country', 'City', 'Organization'],
  },
]

function textMatchesRule(text: string, rule: SectionRule): boolean {
  const normalized = text.toLowerCase()
  return (
    rule.keywords.some((keyword) => normalized.includes(keyword)) ||
    rule.categories.some((category) => normalized.includes(category.toLowerCase()))
  )
}

function clusterMatchesRule(cluster: IntelligenceCluster, rule: SectionRule): boolean {
  const haystack = [cluster.mainTitle, cluster.summary, cluster.category, ...cluster.keywords].join(' ')
  return textMatchesRule(haystack, rule)
}

function articleMatchesRule(article: Article, rule: SectionRule): boolean {
  const haystack = [
    article.title,
    article.summary,
    article.content,
    article.category,
    article.source,
  ].join(' ')

  return textMatchesRule(haystack, rule)
}

function entityMatchesRule(entity: BriefEntitySummary, rule: SectionRule): boolean {
  if (rule.entityTypes.includes(entity.entityType)) {
    return true
  }

  return textMatchesRule(entity.displayText, rule)
}

function buildSentences(parts: string[], min = 2, max = 6): string {
  const unique = [...new Set(parts.map((part) => safeTrim(part)).filter(Boolean))]
  const selected = unique.slice(0, max)

  if (selected.length === 0) {
    return 'No significant intelligence was detected for this section in the current analysis window.'
  }

  while (selected.length < min && selected.length < unique.length) {
    selected.push(unique[selected.length])
  }

  return selected.map((sentence) => (sentence.endsWith('.') ? sentence : `${sentence}.`)).join(' ')
}

function buildSection(
  rule: SectionRule,
  clusters: IntelligenceCluster[],
  articles: Article[],
  entities: BriefEntitySummary[],
): GeneratedBriefSection {
  const matchedClusters = clusters.filter((cluster) => clusterMatchesRule(cluster, rule))
  const matchedArticles = articles.filter((article) => articleMatchesRule(article, rule))
  const matchedEntities = entities.filter((entity) => entityMatchesRule(entity, rule))

  const articleIds = new Set<string>()
  for (const cluster of matchedClusters) {
    for (const articleId of cluster.articleIds) {
      articleIds.add(articleId)
    }
  }
  for (const article of matchedArticles) {
    articleIds.add(article.id)
  }

  const sentences = [
    matchedClusters.length > 0
      ? `${matchedClusters.length} intelligence cluster${matchedClusters.length === 1 ? '' : 's'} highlight activity in ${rule.title.toLowerCase()}`
      : '',
    ...matchedClusters.slice(0, 3).map(
      (cluster) =>
        `${cluster.mainTitle}: ${safeStringOr(cluster.summary, 'Multiple reports cover this topic')}`,
    ),
    matchedEntities.length > 0
      ? `Notable entities include ${matchedEntities
          .slice(0, 4)
          .map((entity) => entity.displayText)
          .join(', ')}`
      : '',
    matchedArticles.length > 0
      ? `${matchedArticles.length} supporting article${matchedArticles.length === 1 ? '' : 's'} contribute additional context`
      : '',
  ]

  const averageClusterConfidence =
    matchedClusters.length === 0
      ? 50
      : matchedClusters.reduce((sum, cluster) => sum + cluster.confidenceScore, 0) /
        matchedClusters.length

  return {
    summary: buildSentences(sentences),
    articleCount: articleIds.size,
    confidenceScore: calculateSectionConfidence({
      articleCount: articleIds.size,
      clusterCount: matchedClusters.length,
      averageClusterConfidence,
    }),
    clusterIds: matchedClusters.map((cluster) => cluster.id),
    articleIds: [...articleIds],
    entityLabels: matchedEntities.slice(0, 8).map((entity) => entity.displayText),
  }
}

function averageTrustScore(trustScores: BriefGenerationInput['trustScores']): number {
  if (trustScores.length === 0) {
    return 0
  }

  return Math.round(
    trustScores.reduce((sum, entry) => sum + entry.trustScore, 0) / trustScores.length,
  )
}

export class DeterministicBriefGenerator implements BriefGeneratorProvider {
  readonly id = 'deterministic'
  readonly name = 'Deterministic'

  async generateBrief(input: BriefGenerationInput): Promise<GeneratedBrief> {
    const { articles, clusters, entities, trustScores } = input
    const entityCount = entities.reduce((sum, entity) => sum + entity.mentionCount, 0)
    const confirmedClusterCount = clusters.filter((cluster) => cluster.agreement === 'Confirmed').length
    const conflictingReports = clusters.filter((cluster) => cluster.agreement === 'Conflicting').length

    const averageClusterConfidence =
      clusters.length === 0
        ? 50
        : clusters.reduce((sum, cluster) => sum + cluster.confidenceScore, 0) / clusters.length

    const sectionByRule = new Map(
      SECTION_RULES.map((rule) => [rule.id, buildSection(rule, clusters, articles, entities)]),
    )

    const sections = SECTION_RULES.map((rule) => sectionByRule.get(rule.id)!)

    const averageSectionConfidence =
      sections.length === 0
        ? 50
        : sections.reduce((sum, section) => sum + section.confidenceScore, 0) / sections.length

    const importanceScore = calculateImportanceScore({
      articleCount: articles.length,
      clusterCount: clusters.length,
      entityCount,
      averageClusterConfidence,
      confirmedClusterCount,
    })

    const riskLevel = calculateRiskLevel(clusters, conflictingReports)

    const topCluster = [...clusters].sort(
      (left, right) => right.confidenceScore - left.confidenceScore,
    )[0]

    const topTechnology = entities.find((entity) => entity.entityType === 'Technology')
    const topOrganization = entities.find((entity) => entity.entityType === 'Organization')
    const topCountry = entities.find((entity) => entity.entityType === 'Country')

    const sourceMap = new Map<string, number>()
    for (const article of articles) {
      const source = safeStringOr(article.source, 'Unknown source')
      sourceMap.set(source, (sourceMap.get(source) ?? 0) + 1)
    }

    const sourcesUsed = [...sourceMap.entries()]
      .map(([sourceName, articleCount]) => ({ sourceName, articleCount }))
      .sort((left, right) => right.articleCount - left.articleCount)

    const trustAverage = averageTrustScore(trustScores)

    const executiveSummary = buildSentences([
      `Today's intelligence brief analyzes ${articles.length} articles across ${clusters.length} fused clusters and ${entities.length} tracked entity groups`,
      trustScores.length > 0
        ? `Average source trust across ${trustScores.length} configured sources is ${trustAverage}%`
        : 'No configured sources are available for trust scoring',
      topCluster
        ? `The highest-confidence event is "${topCluster.mainTitle}" with ${topCluster.reportCount} related reports`
        : 'No dominant fused cluster emerged in the current analysis window',
      confirmedClusterCount > 0
        ? `${confirmedClusterCount} confirmed multi-source events increase briefing confidence`
        : 'Most intelligence remains single-source and should be validated before action',
      conflictingReports > 0
        ? `${conflictingReports} conflicting report clusters elevate operational risk`
        : 'No major conflicting narratives were detected across sources',
      `Overall briefing importance is scored at ${importanceScore} with ${riskLevel.toLowerCase()} risk`,
    ])

    const summary = buildSentences([
      executiveSummary,
      sections
        .filter((section) => section.articleCount > 0)
        .slice(0, 3)
        .map((section, index) => `${SECTION_RULES[index].title}: ${section.summary}`)
        .join(' '),
    ])

    const confidenceScore = calculateOverallConfidence({
      importanceScore,
      averageSectionConfidence,
      averageClusterConfidence,
    })

    const today = new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const getSection = (id: BriefSectionId): GeneratedBriefSection =>
      sectionByRule.get(id) ?? {
        summary: 'No significant intelligence was detected for this section in the current analysis window.',
        articleCount: 0,
        confidenceScore: 50,
        clusterIds: [],
        articleIds: [],
        entityLabels: [],
      }

    return {
      title: `Intelligence Brief — ${today}`,
      summary,
      executive_summary: executiveSummary,
      risk_level: riskLevel,
      importance_score: importanceScore,
      key_events: getSection('key-events'),
      emerging_technologies: getSection('emerging-technologies'),
      cybersecurity: getSection('cyber-security'),
      ai: getSection('ai'),
      business: getSection('business'),
      crypto: getSection('crypto'),
      world_affairs: getSection('world-affairs'),
      confidence_score: confidenceScore,
      sources_used: sourcesUsed,
      article_count: articles.length,
      cluster_count: clusters.length,
      entity_count: entityCount,
      topEvent: topCluster
        ? {
            label: 'Top Event',
            value: topCluster.mainTitle,
            confidenceScore: topCluster.confidenceScore,
          }
        : null,
      topTechnology: topTechnology
        ? {
            label: 'Most Important Technology',
            value: topTechnology.displayText,
            confidenceScore: calculateSectionConfidence({
              articleCount: topTechnology.articleCount,
              clusterCount: 0,
              averageClusterConfidence: 70,
            }),
          }
        : null,
      topOrganization: topOrganization
        ? {
            label: 'Most Mentioned Organization',
            value: topOrganization.displayText,
            confidenceScore: calculateSectionConfidence({
              articleCount: topOrganization.articleCount,
              clusterCount: 0,
              averageClusterConfidence: 70,
            }),
          }
        : null,
      topCountry: topCountry
        ? {
            label: 'Most Mentioned Country',
            value: topCountry.displayText,
            confidenceScore: calculateSectionConfidence({
              articleCount: topCountry.articleCount,
              clusterCount: 0,
              averageClusterConfidence: 70,
            }),
          }
        : null,
      relatedClusterIds: clusters.map((cluster) => cluster.id),
      relatedArticleIds: articles.map((article) => article.id),
      relatedEntities: entities.slice(0, 20).map((entity) => ({
        type: entity.entityType,
        label: entity.displayText,
        count: entity.mentionCount,
      })),
      providerId: this.id,
    }
  }
}

export const deterministicBriefGenerator = new DeterministicBriefGenerator()
