import { useCallback, useEffect, useState } from 'react'
import { useDataRefresh } from '@/contexts/DataRefreshContext'
import type { FusionDashboardStats, IntelligenceCluster } from '@/intelligence/fusion/FusionCluster'
import {
  getFusionClusters,
  getFusionDashboardStats,
  rebuildFusionClusters,
  subscribeFusionClusters,
} from '@/services/fusionClusterService'

export function useFusionClusters() {
  const { refreshToken } = useDataRefresh()
  const [clusters, setClusters] = useState<IntelligenceCluster[]>([])
  const [stats, setStats] = useState<FusionDashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshLocalState = useCallback(() => {
    setClusters(getFusionClusters())
    setStats(getFusionDashboardStats())
  }, [])

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      await rebuildFusionClusters()
      refreshLocalState()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fusion clusters')
    } finally {
      setIsLoading(false)
    }
  }, [refreshLocalState])

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        await rebuildFusionClusters()
        if (isMounted) {
          refreshLocalState()
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load fusion clusters')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    load()

    const unsubscribe = subscribeFusionClusters(() => {
      if (isMounted) {
        refreshLocalState()
      }
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [refreshToken, refreshLocalState])

  return { clusters, stats, isLoading, error, refetch }
}
