import type {
  ConnectorHealthResult,
  ConnectorPreviewResult,
  ConnectorValidationResult,
  IntelligenceItem,
} from '@/intelligence/types'
import type { FeedImportResult } from '@/types/rss'
import type { ConnectionTestResult, ConnectorId } from '@/types/connectorSettings'
import type { Source } from '@/types/source'

/**
 * Universal connector provider contract.
 * Future providers implement this interface without UI or schema changes.
 */
export interface ConnectorProvider {
  readonly connectorId: ConnectorId
  readonly catalogType: string

  testConnection(): Promise<ConnectionTestResult>
  sync(source: Source, userId: string, selectedIds?: string[]): Promise<FeedImportResult>
  collect(source: Source): Promise<IntelligenceItem[]>
  normalize(source: Source, raw: unknown): Promise<IntelligenceItem[]>
  validate(source: Source): Promise<ConnectorValidationResult>
  preview(source: Source): Promise<ConnectorPreviewResult>
  healthCheck(source: Source): Promise<ConnectorHealthResult>
  calculateHealth(): Promise<number>
}
