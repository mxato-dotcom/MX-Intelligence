import type { IntelligenceConnector } from '@/intelligence/connector/IntelligenceConnector'
import type {
  ConnectorHealthResult,
  ConnectorPreviewResult,
  ConnectorValidationResult,
  IntelligenceItem,
} from '@/intelligence/types'
import type { Source } from '@/types/source'

export const NOT_IMPLEMENTED_MESSAGE = 'Not implemented yet'

export abstract class BasePlaceholderConnector implements IntelligenceConnector {
  abstract readonly type: string
  readonly implemented = false

  async validate(_source: Source): Promise<ConnectorValidationResult> {
    return { success: false, message: NOT_IMPLEMENTED_MESSAGE }
  }

  async healthCheck(_source: Source): Promise<ConnectorHealthResult> {
    return {
      success: false,
      status: 'unhealthy',
      message: NOT_IMPLEMENTED_MESSAGE,
      latencyMs: 0,
    }
  }

  async preview(_source: Source): Promise<ConnectorPreviewResult> {
    return {
      success: false,
      items: [],
      downloaded: 0,
      error: NOT_IMPLEMENTED_MESSAGE,
      durationMs: 0,
    }
  }

  async collect(_source: Source): Promise<IntelligenceItem[]> {
    throw new Error(NOT_IMPLEMENTED_MESSAGE)
  }

  async normalize(_source: Source, _raw: unknown): Promise<IntelligenceItem[]> {
    throw new Error(NOT_IMPLEMENTED_MESSAGE)
  }
}

export class PlaceholderConnector extends BasePlaceholderConnector {
  constructor(readonly type: string) {
    super()
  }
}
