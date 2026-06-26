import { useEffect, useState } from 'react'
import { useDataRefresh } from '@/contexts/DataRefreshContext'
import type { Article } from '@/types/article'
import type { DailyBrief } from '@/types/brief'
import type { Video } from '@/types/video'
import type { Source } from '@/types/source'
import type { TrustDashboardStats } from '@/intelligence/scoring/TrustScoreEngine'
import * as dashboardService from '@/services/dashboardService'
import * as sourceService from '@/services/sourceService'
import { trustScoreEngine } from '@/intelligence/scoring/TrustScoreEngine'
import type { DashboardStats } from '@/services/dashboardService'

export interface DashboardData {
  stats: DashboardStats
  trustStats: TrustDashboardStats
  sources: Source[]
  latestArticles: Article[]
  latestVideos: Video[]
  dailyBrief: DailyBrief | null
  highlightsText: string
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
        const [latestArticles, latestVideos, stats, dailyBrief, sources] = await Promise.all([
          dashboardService.getLatestArticles(5),
          dashboardService.getLatestVideos(5),
          dashboardService.getDashboardStats(),
          dashboardService.getLatestDailyBrief(),
          sourceService.getSources(),
        ])

        const trustStats = trustScoreEngine.computeDashboardStats(sources)

        const highlightsText =
          dailyBrief?.content?.trim() ||
          dashboardService.generatePlaceholderBrief(latestArticles, latestVideos)

        if (isMounted) {
          setData({
            stats,
            trustStats,
            sources,
            latestArticles,
            latestVideos,
            dailyBrief,
            highlightsText,
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
