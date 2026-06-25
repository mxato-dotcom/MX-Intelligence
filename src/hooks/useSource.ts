import { useCallback, useEffect, useState } from 'react'
import { useDataRefresh } from '@/contexts/DataRefreshContext'
import * as sourceService from '@/services/sourceService'
import type { Source } from '@/types/source'

export function useSource(id: string | undefined) {
  const { refreshToken } = useDataRefresh()
  const [source, setSource] = useState<Source | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!id) {
      setSource(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await sourceService.getSourceById(id)
      setSource(data)
      if (!data) {
        setError('Source not found')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load source')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    refetch()
  }, [refetch, refreshToken])

  return { source, isLoading, error, refetch }
}
