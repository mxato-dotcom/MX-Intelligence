import { supabase } from '@/lib/supabase'
import type { ApiKeyProviderId } from '@/types/connectorConfig'

export interface ApiKeyStatus {
  provider: string
  configured: boolean
}

interface ManageApiKeyResponse {
  success: boolean
  statuses?: ApiKeyStatus[]
  error?: string
}

export async function getApiKeyStatuses(): Promise<ApiKeyStatus[]> {
  const { data, error } = await supabase.functions.invoke('manage-api-key', {
    body: { action: 'status' },
  })

  if (error) {
    throw new Error('Failed to load API key status')
  }

  const payload = data as ManageApiKeyResponse

  if (!payload?.success) {
    throw new Error(payload?.error ?? 'Failed to load API key status')
  }

  return payload.statuses ?? []
}

export async function saveApiKey(provider: ApiKeyProviderId, secret: string): Promise<void> {
  const trimmed = secret.trim()

  if (!trimmed) {
    throw new Error('API key cannot be empty')
  }

  const { data, error } = await supabase.functions.invoke('manage-api-key', {
    body: { action: 'save', provider, secret: trimmed },
  })

  if (error) {
    throw new Error('Failed to save API key')
  }

  const payload = data as ManageApiKeyResponse

  if (!payload?.success) {
    throw new Error(payload?.error ?? 'Failed to save API key')
  }
}

export async function deleteApiKey(provider: ApiKeyProviderId): Promise<void> {
  const { data, error } = await supabase.functions.invoke('manage-api-key', {
    body: { action: 'delete', provider },
  })

  if (error) {
    throw new Error('Failed to delete API key')
  }

  const payload = data as ManageApiKeyResponse

  if (!payload?.success) {
    throw new Error(payload?.error ?? 'Failed to delete API key')
  }
}
