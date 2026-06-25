import * as connectorService from '@/services/connectorService'
import type {
  ConnectorHealthResult,
  ConnectorValidationResult,
} from '@/intelligence/types'
import type { Source } from '@/types/source'

export async function validateSource(source: Source): Promise<ConnectorValidationResult> {
  return connectorService.validateSource(source)
}

export async function runHealthCheck(source: Source): Promise<ConnectorHealthResult> {
  return connectorService.runHealthCheck(source)
}
