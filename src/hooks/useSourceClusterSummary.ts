import { useEffect, useState } from 'react'
import type { SourceClusterSummary } from '@/intelligence/fusion/FusionCluster'
import { fusionEngine } from '@/intelligence/fusion/FusionEngine'
import { subscribeFusionClusters } from '@/services/fusionClusterService'

export function useSourceClusterSummary(sourceName: string): SourceClusterSummary {
  const [summary, setSummary] = useState<SourceClusterSummary>(() =>
    fusionEngine.getSourceClusterSummary(sourceName),
  )

  useEffect(() => {
    const refresh = () => {
      setSummary(fusionEngine.getSourceClusterSummary(sourceName))
    }

    refresh()
    return subscribeFusionClusters(refresh)
  }, [sourceName])

  return summary
}
