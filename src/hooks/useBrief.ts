import { useEffect, useState } from 'react'
import type { IntelligenceDailyBrief } from '@/intelligence/brief/BriefTypes'
import type { IntelligenceCluster } from '@/intelligence/fusion/FusionCluster'
import type { Article } from '@/types/article'
import * as articleService from '@/services/articleService'
import { getDailyBriefById } from '@/services/dailyBriefService'
import { getFusionClusters, rebuildFusionClusters } from '@/services/fusionClusterService'

export function useBrief(id: string | undefined) {
  const [brief, setBrief] = useState<IntelligenceDailyBrief | null>(null)
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([])
  const [relatedClusters, setRelatedClusters] = useState<IntelligenceCluster[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setBrief(null)
      setRelatedArticles([])
      setRelatedClusters([])
      setIsLoading(false)
      return
    }

    let isMounted = true

    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const loadedBrief = await getDailyBriefById(id)
        if (!loadedBrief) {
          if (isMounted) {
            setBrief(null)
            setRelatedArticles([])
            setRelatedClusters([])
            setError('Brief not found')
          }
          return
        }

        await rebuildFusionClusters()
        const clusterIds = new Set(loadedBrief.payload.relatedClusterIds)
        const clusters = getFusionClusters().filter((cluster) => clusterIds.has(cluster.id))

        const articleIds = loadedBrief.payload.relatedArticleIds.slice(0, 20)
        const articles = await Promise.all(
          articleIds.map((articleId) => articleService.getArticleById(articleId)),
        )

        if (isMounted) {
          setBrief(loadedBrief)
          setRelatedArticles(articles.filter((article): article is Article => article !== null))
          setRelatedClusters(clusters.slice(0, 10))
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load brief')
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
  }, [id])

  return { brief, relatedArticles, relatedClusters, isLoading, error }
}
