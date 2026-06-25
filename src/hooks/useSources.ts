import { useCallback, useEffect, useState } from 'react'
import * as sourceService from '@/services/sourceService'
import type { Source } from '@/types/source'

export function useSources() {
  const [sources, setSources] = useState<Source[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await sourceService.getSources()
      setSources(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sources')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { sources, isLoading, error, refetch }
}
