import type { IntelligenceItem } from '@/intelligence/types/IntelligenceItem'
import type { Source } from '@/types/source'

export interface NormalizerContext {
  source: Source
  connectorType: string
  feedLanguage?: string | null
}

export interface Normalizer<TInput> {
  readonly type: string
  normalize(data: TInput, context: NormalizerContext): Promise<IntelligenceItem>
  normalizeMany(data: TInput[], context: NormalizerContext): Promise<IntelligenceItem[]>
}
