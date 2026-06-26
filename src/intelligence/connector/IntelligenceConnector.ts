import type {
  ConnectorHealthResult,
  ConnectorPreviewResult,
  ConnectorValidationResult,
  IntelligenceItem,
} from '@/intelligence/types'
import type { Source } from '@/types/source'

/** Universal intelligence connector contract — all source types implement this interface. */
export interface IntelligenceConnector {
  readonly type: string
  /** True when preview/collect/import are fully implemented (not a placeholder). */
  readonly implemented: boolean
  validate(source: Source): Promise<ConnectorValidationResult>
  healthCheck(source: Source): Promise<ConnectorHealthResult>
  preview(source: Source): Promise<ConnectorPreviewResult>
  collect(source: Source): Promise<IntelligenceItem[]>
  normalize(source: Source, raw: unknown): Promise<IntelligenceItem[]>
}

export type {
  ConnectorHealthResult,
  ConnectorPreviewResult,
  ConnectorValidationResult,
  IntelligenceItem,
}
