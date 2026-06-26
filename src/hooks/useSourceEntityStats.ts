import { useEffect, useState } from 'react'
import { useDataRefresh } from '@/contexts/DataRefreshContext'
import type { SourceEntityStats } from '@/services/entityService'
import { getSourceEntityStats } from '@/services/entityExtractionService'

export function useSourceEntityStats(sourceName: string): SourceEntityStats {
  const { refreshToken } = useDataRefresh()
  const [stats, setStats] = useState<SourceEntityStats>(() => ({
    sourceName,
    articleCount: 0,
    entityCount: 0,
    averageEntitiesPerArticle: 0,
  }))

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      try {
        const result = await getSourceEntityStats(sourceName)
        if (isMounted) {
          setStats(result)
        }
      } catch {
        if (isMounted) {
          setStats({
            sourceName,
            articleCount: 0,
            entityCount: 0,
            averageEntitiesPerArticle: 0,
          })
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [sourceName, refreshToken])

  return stats
}
