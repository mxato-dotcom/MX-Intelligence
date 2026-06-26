import { useEffect, useState } from 'react'
import { useDataRefresh } from '@/contexts/DataRefreshContext'
import type { IntelligenceDailyBrief } from '@/intelligence/brief/BriefTypes'
import type { Article } from '@/types/article'
import type { Video } from '@/types/video'
import type { Source } from '@/types/source'
import type { TrustDashboardStats } from '@/intelligence/scoring/TrustScoreEngine'
import type { FusionDashboardStats, IntelligenceCluster } from '@/intelligence/fusion/FusionCluster'
import * as dashboardService from '@/services/dashboardService'
import * as sourceService from '@/services/sourceService'
import { getLatestDailyBrief } from '@/services/dailyBriefService'
import { trustScoreEngine } from '@/intelligence/scoring/TrustScoreEngine'
import { rebuildFusionClusters, getFusionDashboardStats, getFusionClusters } from '@/services/fusionClusterService'
import { getEntityDashboardStats } from '@/services/entityExtractionService'
import type { EntityDashboardStats } from '@/services/entityService'
import type { DashboardStats } from '@/services/dashboardService'

export interface DashboardData {
  stats: DashboardStats
  trustStats: TrustDashboardStats
  fusionStats: FusionDashboardStats
  topClusters: IntelligenceCluster[]
  entityStats: EntityDashboardStats
  sources: Source[]
  latestArticles: Article[]
  latestVideos: Video[]
  intelligenceBrief: IntelligenceDailyBrief | null
}

export function useDashboard() {
  const { refreshToken } = useDataRefresh()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const [latestArticles, latestVideos, stats, intelligenceBrief, sources] = await Promise.all([
          dashboardService.getLatestArticles(5),
          dashboardService.getLatestVideos(5),
          dashboardService.getDashboardStats(),
          getLatestDailyBrief(),
          sourceService.getSources(),
        ])

        const trustStats = trustScoreEngine.computeDashboardStats(sources)
        await rebuildFusionClusters()
        const fusionStats = getFusionDashboardStats()
        const topClusters = getFusionClusters().slice(0, 5)
        const entityStats = await getEntityDashboardStats()

        if (isMounted) {
          setData({
            stats,
            trustStats,
            fusionStats,
            topClusters,
            entityStats,
            sources,
            latestArticles,
            latestVideos,
            intelligenceBrief,
          })
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [refreshToken])

  return { data, isLoading, error }
}
