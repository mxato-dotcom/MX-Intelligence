import { useCallback, useState } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { testConnectorConnection } from '@/services/connectorCredentialService'
import type { ConnectorId, ConnectionTestStatus } from '@/types/connectorSettings'

function mapFailureStatus(
  status: ConnectionTestStatus | 'healthy' | 'failed',
): ConnectionTestStatus {
  if (status === 'healthy' || status === 'connected') {
    return 'connected'
  }
  if (status === 'failed') {
    return 'provider_error'
  }
  return status
}

interface UseConnectionTestOptions {
  connectorId: ConnectorId
  connectorName?: string
  onComplete?: () => void
}

export function useConnectionTest({
  connectorId,
  connectorName,
  onComplete,
}: UseConnectionTestOptions) {
  const { showToast } = useToast()
  const [status, setStatus] = useState<ConnectionTestStatus | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [latencyMs, setLatencyMs] = useState<number | undefined>()
  const [testedAt, setTestedAt] = useState<string | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  const test = useCallback(async () => {
    setIsTesting(true)
    setStatus('connecting')
    setMessage(null)
    setLatencyMs(undefined)

    try {
      const result = await testConnectorConnection(connectorId)
      const now = new Date().toISOString()
      setStatus(result.connected ? 'connected' : mapFailureStatus(result.status))
      setMessage(result.message)
      setLatencyMs(result.latencyMs)
      setTestedAt(now)

      if (result.connected) {
        showToast(
          `${connectorName ?? 'Connector'} connection successful`,
          'success',
        )
      } else {
        showToast(result.message || 'Connection test failed', 'error')
      }

      onComplete?.()
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : 'Network error'
      setStatus('network_error')
      setMessage(errMessage)
      setTestedAt(new Date().toISOString())
      showToast(errMessage, 'error')
    } finally {
      setIsTesting(false)
    }
  }, [connectorId, connectorName, onComplete, showToast])

  return {
    test,
    status,
    message,
    latencyMs,
    testedAt,
    isTesting,
  }
}
