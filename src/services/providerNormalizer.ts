import type { NormalizerContext } from '@/intelligence/normalizers/Normalizer'
import { buildIntelligenceItem, type IntelligenceItemInput } from '@/intelligence/normalizers/buildIntelligenceItem'
import type { IntelligenceItem } from '@/intelligence/types/IntelligenceItem'
import { catalogTypeToConnectorId } from '@/types/connectorSettings'

export interface NormalizedArticle {
  title: string
  summary: string
  content: string
  author?: string
  published_at: string
  source: string
  url: string
  image?: string
  language?: string
  provider: string
  category: string
  trust_score: number
  entities: string[]
  cluster_id?: string | null
  connector_id: string
  metadata: Record<string, unknown>
}

export function intelligenceItemToNormalizedArticle(item: IntelligenceItem): NormalizedArticle {
  const connectorId = catalogTypeToConnectorId(item.connectorType) ?? item.connectorType

  return {
    title: item.title,
    summary: item.summary,
    content: item.content,
    author: item.author,
    published_at: item.publishedAt,
    source: item.sourceName,
    url: item.url,
    image: item.imageUrl,
    language: item.language,
    provider: item.connectorType,
    category: item.category,
    trust_score: item.trustScore,
    entities: [],
    cluster_id: null,
    connector_id: connectorId,
    metadata: {
      tags: item.tags,
      raw_provider: item.connectorType,
      source_id: item.sourceId,
      evidence_sources: [
        {
          provider: item.connectorType,
          sourceName: item.sourceName,
          url: item.url,
          importedAt: new Date().toISOString(),
        },
      ],
    },
  }
}

export async function normalizeProviderItem(
  context: NormalizerContext,
  input: IntelligenceItemInput,
): Promise<IntelligenceItem> {
  return buildIntelligenceItem(context, input)
}

export function buildArticleMetadata(
  item: IntelligenceItem,
  existingMetadata?: Record<string, unknown>,
): Record<string, unknown> {
  const connectorId = catalogTypeToConnectorId(item.connectorType) ?? item.connectorType
  const evidence = (existingMetadata?.evidence_sources as unknown[]) ?? []
  const newEvidence = {
    provider: item.connectorType,
    sourceName: item.sourceName,
    url: item.url,
    importedAt: new Date().toISOString(),
  }

  return {
    ...existingMetadata,
    provider: item.connectorType,
    connector_id: connectorId,
    author: item.author ?? existingMetadata?.author,
    language: item.language ?? existingMetadata?.language,
    evidence_sources: [...evidence, newEvidence],
    duplicate_confidence: evidence.length + 1,
  }
}
