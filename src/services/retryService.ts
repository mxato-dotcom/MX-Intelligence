export const RETRY_DELAYS_MS = [60_000, 300_000, 900_000] as const

export const MAX_AUTO_RETRIES = 3

export function getRetryDelayMs(attemptIndex: number): number | null {
  if (attemptIndex < 0 || attemptIndex >= RETRY_DELAYS_MS.length) {
    return null
  }
  return RETRY_DELAYS_MS[attemptIndex]
}

export function shouldAutoRetry(attempts: number, maxAttempts: number): boolean {
  return attempts < maxAttempts && attempts < MAX_AUTO_RETRIES
}

export function classifySyncError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('401') || lower.includes('403') || lower.includes('auth')) {
    return 'auth_failed'
  }
  if (lower.includes('429') || lower.includes('rate')) {
    return 'rate_limited'
  }
  if (lower.includes('timeout') || lower.includes('network')) {
    return 'network_error'
  }
  if (lower.includes('offline') || lower.includes('failed to fetch')) {
    return 'provider_offline'
  }
  return 'provider_error'
}
