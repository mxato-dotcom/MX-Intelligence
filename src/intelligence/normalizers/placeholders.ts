import type { Normalizer } from '@/intelligence/normalizers/Normalizer'
import type { IntelligenceItem } from '@/intelligence/types/IntelligenceItem'

export const NORMALIZER_NOT_IMPLEMENTED = 'Normalizer not implemented'

export class PlaceholderNormalizer<TInput = unknown> implements Normalizer<TInput> {
  constructor(readonly type: string) {}

  async normalize(_data: TInput): Promise<IntelligenceItem> {
    throw new Error(NORMALIZER_NOT_IMPLEMENTED)
  }

  async normalizeMany(_data: TInput[]): Promise<IntelligenceItem[]> {
    throw new Error(NORMALIZER_NOT_IMPLEMENTED)
  }
}
