import { useEffect, useState } from 'react'
import * as articleService from '@/services/articleService'
import type { Article } from '@/types/article'

export function useArticle(id: string | undefined) {
  const [article, setArticle] = useState<Article | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setArticle(null)
      setIsLoading(false)
      return
    }

    let isMounted = true

    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const data = await articleService.getArticleById(id)
        if (isMounted) {
          setArticle(data)
          if (!data) {
            setError('Article not found')
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load article')
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

  return { article, isLoading, error }
}
