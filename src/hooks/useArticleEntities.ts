import { useEffect, useState } from 'react'
import type { GroupedArticleEntities } from '@/intelligence/entities/Entity'
import { useDataRefresh } from '@/contexts/DataRefreshContext'
import { getEntitiesForArticle, groupEntitiesByType } from '@/services/entityService'

export function useArticleEntities(articleId: string | undefined) {
  const { refreshToken } = useDataRefresh()
  const [groups, setGroups] = useState<GroupedArticleEntities[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!articleId) {
      setGroups([])
      setIsLoading(false)
      return
    }

    let isMounted = true

    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const entities = await getEntitiesForArticle(articleId)
        if (isMounted) {
          setGroups(groupEntitiesByType(entities))
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load entities')
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
  }, [articleId, refreshToken])

  return { groups, isLoading, error }
}
