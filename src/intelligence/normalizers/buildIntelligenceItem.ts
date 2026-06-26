import { computeArticleHash } from '@/lib/hash'
import { safeSlice, safeStringOr, safeTrim } from '@/lib/safeString'
import type { NormalizerContext } from '@/intelligence/normalizers/Normalizer'
import type { IntelligenceItem } from '@/intelligence/types/IntelligenceItem'

export interface IntelligenceItemInput {
  title: string
  url: string
  summary?: string
  content?: string
  imageUrl?: string
  author?: string
  publishedAt: string
  language?: string
  tags?: string[]
  rawData: unknown
}

export async function buildIntelligenceItem(
  context: NormalizerContext,
  input: IntelligenceItemInput,
): Promise<IntelligenceItem> {
  const source = context.source
  const title = safeStringOr(input.title, 'Untitled')
  const url = safeTrim(input.url)
  const summary = safeTrim(input.summary) || safeSlice(input.content, 0, 280)
  const content = safeTrim(input.content) || summary
  const category = safeStringOr(source.category, 'Uncategorized')
  const id = await computeArticleHash(url, title)

  return {
    id,
    connectorType: context.connectorType,
    sourceId: source.id,
    sourceName: source.name,
    category,
    title,
    summary,
    content,
    url,
    imageUrl: input.imageUrl,
    author: input.author,
    publishedAt: input.publishedAt,
    language: input.language ?? context.feedLanguage ?? undefined,
    tags: input.tags ?? [],
    trustScore: source.trust_score,
    rawData: input.rawData,
  }
}
