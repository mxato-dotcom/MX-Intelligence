import { briefAlertEngine } from '@/intelligence/alerts/BriefAlertEngine'
import type { IntelligenceDailyBrief } from '@/intelligence/brief/BriefTypes'
import { createAlert } from '@/services/alertService'
import { getFusionClusters, rebuildFusionClusters } from '@/services/fusionClusterService'
import { supabase } from '@/lib/supabase'

async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    return null
  }

  return data.user?.id ?? null
}

export async function syncAlertsForBrief(brief: IntelligenceDailyBrief): Promise<void> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return
    }

    await rebuildFusionClusters()
    const conflictingReportCount = getFusionClusters().filter(
      (cluster) => cluster.agreement === 'Conflicting',
    ).length

    const generatedAlerts = briefAlertEngine.generateAlerts(brief, {
      conflictingReportCount,
    })

    for (const alertInput of generatedAlerts) {
      try {
        await createAlert(alertInput, userId)
      } catch {
        // Continue saving remaining alerts
      }
    }
  } catch {
    // Alert sync should not block brief workflow
  }
}
