import { isRssSource } from '@/lib/sourceType'

/** Registry for intelligence connectors. RSS is the first implementation. */
export function isConnectorSupported(sourceType: string): boolean {
  return isRssSource(sourceType)
}

export function getSupportedConnectorTypes(): string[] {
  return ['RSS']
}

export type ConnectorAction = 'preview' | 'import' | 'validate' | 'healthCheck'

export interface ConnectorCapabilities {
  preview: boolean
  import: boolean
  validate: boolean
  healthCheck: boolean
}

export function getConnectorCapabilities(_sourceType: string): ConnectorCapabilities {
  return { preview: true, import: true, validate: true, healthCheck: true }
}
