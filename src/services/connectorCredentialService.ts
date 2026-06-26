import { supabase } from '@/lib/supabase'
import type { ApiKeyProviderId } from '@/types/connectorConfig'
import type {
  ConnectorId,
  ConnectorReadiness,
  ConnectionTestResult,
  ConnectionTestStatus,
  CredentialProviderStatus,
  CredentialStatus,
} from '@/types/connectorSettings'
import { CONNECTOR_PROVIDERS, getConnectorProvider } from '@/types/connectorSettings'

interface ManageApiKeyResponse {
  success: boolean
  statuses?: CredentialProviderStatus[]
  metadata?: {
    newsapi?: {
      lastTestedAt: string | null
      lastTestStatus: string | null
      lastTestError: string | null
      connected: boolean
    }
    reddit?: {
      lastTestedAt: string | null
      lastTestStatus: string | null
      lastTestError: string | null
      connected: boolean
    }
  }
  error?: string
}

interface TestConnectorResponse {
  success: boolean
  connected?: boolean
  status?: ConnectionTestStatus | 'healthy' | 'failed'
  message?: string
  latency?: number
  latencyMs?: number
  quotaRemaining?: number | string | null
  error?: string
}

function mapTestStatusToConnectionStatus(
  status: TestConnectorResponse['status'],
  connected?: boolean,
): ConnectionTestStatus {
  if (connected || status === 'healthy' || status === 'connected') {
    return 'connected'
  }
  if (status === 'failed' || status === 'auth_failed') {
    return 'auth_failed'
  }
  if (status === 'rate_limited') {
    return 'rate_limited'
  }
  if (status === 'network_error') {
    return 'network_error'
  }
  if (status === 'provider_error') {
    return 'provider_error'
  }
  return 'unknown'
}

export async function getCredentialStatuses(): Promise<CredentialProviderStatus[]> {
  const { data, error } = await supabase.functions.invoke('manage-api-key', {
    body: { action: 'status' },
  })

  if (error) {
    throw new Error('Failed to load credential status')
  }

  const payload = data as ManageApiKeyResponse

  if (!payload?.success) {
    throw new Error(payload?.error ?? 'Failed to load credential status')
  }

  return payload.statuses ?? []
}

export async function getCredentialMetadata(): Promise<ManageApiKeyResponse['metadata']> {
  const { data, error } = await supabase.functions.invoke('manage-api-key', {
    body: { action: 'status' },
  })

  if (error) {
    throw new Error('Failed to load credential metadata')
  }

  const payload = data as ManageApiKeyResponse

  if (!payload?.success) {
    throw new Error(payload?.error ?? 'Failed to load credential metadata')
  }

  return payload.metadata ?? {}
}

export async function saveCredential(provider: ApiKeyProviderId, secret: string): Promise<void> {
  const trimmed = secret.trim()

  if (!trimmed) {
    throw new Error('Credential cannot be empty')
  }

  const { data, error } = await supabase.functions.invoke('manage-api-key', {
    body: { action: 'save', provider, secret: trimmed },
  })

  if (error) {
    throw new Error('Failed to save credential')
  }

  const payload = data as ManageApiKeyResponse

  if (!payload?.success) {
    throw new Error(payload?.error ?? 'Failed to save credential')
  }
}

export async function deleteCredential(provider: ApiKeyProviderId): Promise<void> {
  const { data, error } = await supabase.functions.invoke('manage-api-key', {
    body: { action: 'delete', provider },
  })

  if (error) {
    throw new Error('Failed to delete credential')
  }

  const payload = data as ManageApiKeyResponse

  if (!payload?.success) {
    throw new Error(payload?.error ?? 'Failed to delete credential')
  }
}

export async function deleteConnectorCredentials(connectorId: ConnectorId): Promise<void> {
  const provider = getConnectorProvider(connectorId)
  const providers = [
    ...provider.requiredCredentialProviders,
    ...provider.optionalCredentialProviders,
  ] as ApiKeyProviderId[]

  for (const credentialProvider of providers) {
    const statuses = await getCredentialStatuses()
    const configured = statuses.find((row) => row.provider === credentialProvider)?.configured
    if (configured) {
      await deleteCredential(credentialProvider)
    }
  }
}

export async function testConnectorConnection(
  connectorId: ConnectorId,
): Promise<ConnectionTestResult> {
  const { data, error } = await supabase.functions.invoke('test-connector', {
    body: { connectorId },
  })

  if (error) {
    return {
      connected: false,
      status: 'network_error',
      message: 'Network error',
    }
  }

  const payload = data as TestConnectorResponse

  if (!payload) {
    return {
      connected: false,
      status: 'unknown',
      message: 'Connection test failed',
    }
  }

  const connected = payload.connected === true || payload.status === 'healthy'
  const latencyMs = payload.latency ?? payload.latencyMs
  const mappedStatus = mapTestStatusToConnectionStatus(payload.status, connected)

  if (!payload.success || !connected) {
    const message = payload.error ?? payload.message ?? 'Connection test failed'
    return {
      connected: false,
      status: mappedStatus,
      message,
      latencyMs,
      quotaRemaining: payload.quotaRemaining,
    }
  }

  return {
    connected: true,
    status: mappedStatus,
    message: payload.message ?? 'Connection successful',
    latencyMs,
    quotaRemaining: payload.quotaRemaining,
  }
}

function resolveCredentialStatus(
  connectorId: ConnectorId,
  statuses: CredentialProviderStatus[],
): CredentialStatus {
  const provider = getConnectorProvider(connectorId)
  const configuredSet = new Set(
    statuses.filter((row) => row.configured).map((row) => row.provider),
  )

  const requiredMissing = provider.requiredCredentialProviders.filter(
    (key) => !configuredSet.has(key),
  )

  if (requiredMissing.length > 0) {
    return 'missing'
  }

  const optionalConfigured = provider.optionalCredentialProviders.some((key) =>
    configuredSet.has(key),
  )

  if (provider.requiredCredentialProviders.length === 0 && !optionalConfigured) {
    return 'configured'
  }

  if (provider.optionalCredentialProviders.length > 0 && optionalConfigured) {
    return 'configured'
  }

  if (provider.requiredCredentialProviders.length > 0) {
    return 'configured'
  }

  return 'partial'
}

export function evaluateConnectorReadiness(
  connectorId: ConnectorId,
  statuses: CredentialProviderStatus[],
): ConnectorReadiness {
  const provider = getConnectorProvider(connectorId)
  const configuredSet = new Set(
    statuses.filter((row) => row.configured).map((row) => row.provider),
  )

  const missingCredentials = provider.requiredCredentialProviders.filter(
    (key) => !configuredSet.has(key),
  )

  const credentialStatus = resolveCredentialStatus(connectorId, statuses)
  const ready = missingCredentials.length === 0

  let message = 'Ready'
  if (!ready) {
    message = 'No credentials configured'
  } else if (credentialStatus === 'partial') {
    message = 'Partial credentials (optional fields missing)'
  }

  return {
    connectorId,
    ready,
    credentialStatus,
    missingCredentials,
    message,
  }
}

export async function getConnectorReadiness(connectorId: ConnectorId): Promise<ConnectorReadiness> {
  const statuses = await getCredentialStatuses()
  return evaluateConnectorReadiness(connectorId, statuses)
}

export async function isConnectorReady(connectorId: ConnectorId): Promise<boolean> {
  const readiness = await getConnectorReadiness(connectorId)
  return readiness.ready
}

export function getConnectorIds(): ConnectorId[] {
  return CONNECTOR_PROVIDERS.map((entry) => entry.id)
}
