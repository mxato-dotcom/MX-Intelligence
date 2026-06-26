import { useEffect, useState } from 'react'
import { subscribeSourceMetrics } from '@/intelligence/scoring/SourceMetrics'
import {
  formatTrendLabel,
  trustScoreEngine,
  type SourceHealthLabel,
  type SourceScoreResult,
} from '@/intelligence/scoring/TrustScoreEngine'
import type { Source } from '@/types/source'

export function useSourceTrust(source: Source): SourceScoreResult {
  const [profile, setProfile] = useState<SourceScoreResult>(() =>
    trustScoreEngine.calculateSourceScore(source),
  )

  useEffect(() => {
    const refresh = () => {
      setProfile(trustScoreEngine.calculateSourceScore(source))
    }

    refresh()
    return subscribeSourceMetrics(refresh)
  }, [source])

  return profile
}

export { formatTrendLabel, type SourceHealthLabel, type SourceScoreResult }
