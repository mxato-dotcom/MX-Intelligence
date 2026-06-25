import { useCallback, useEffect, useState } from 'react'
import { useDataRefresh } from '@/contexts/DataRefreshContext'
import * as articleService from '@/services/articleService'
import type { Article } from '@/types/article'

export function useArticles() {
  const { refreshToken } = useDataRefresh()
  const [articles, setArticles] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await articleService.getArticles()
      setArticles(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load articles')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const data = await articleService.getArticles()
        if (isMounted) {
          setArticles(data)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load articles')
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

  return { articles, isLoading, error, refetch }
}
