import type { IntelligenceDailyBrief } from '@/intelligence/brief/BriefTypes'
import type { AlertSeverity, CreateAlertInput } from '@/types/alert'

export interface BriefAlertEngineOptions {
  conflictingReportCount?: number
}

function findSection(brief: IntelligenceDailyBrief, sectionId: string) {
  return brief.payload.sections.find((section) => section.id === sectionId)
}

function hasCybersecurityContent(brief: IntelligenceDailyBrief): boolean {
  const section = findSection(brief, 'cyber-security')
  if (!section) {
    return false
  }

  return section.articleCount > 0 || section.summary.trim().length > 0
}

export class BriefAlertEngine {
  generateAlerts(
    brief: IntelligenceDailyBrief,
    options: BriefAlertEngineOptions = {},
  ): CreateAlertInput[] {
    const alerts: CreateAlertInput[] = []
    const confidence = brief.payload.overallConfidence
    const conflictingCount = options.conflictingReportCount ?? 0

    if (brief.riskLevel === 'Critical') {
      alerts.push({
        title: 'Critical risk intelligence brief',
        message: `Brief "${brief.title}" reports critical risk (${brief.riskLevel}). Review immediately.`,
        severity: 'critical',
        category: 'risk',
        relatedBriefId: brief.id,
      })
    } else if (brief.riskLevel === 'High') {
      alerts.push({
        title: 'High risk intelligence brief',
        message: `Brief "${brief.title}" reports elevated risk (${brief.riskLevel}). Executive review recommended.`,
        severity: 'high',
        category: 'risk',
        relatedBriefId: brief.id,
      })
    }

    if (brief.importanceScore >= 80) {
      alerts.push({
        title: 'High-importance briefing',
        message: `Brief "${brief.title}" scored ${brief.importanceScore}% importance across ${brief.articleCount} articles.`,
        severity: brief.importanceScore >= 90 ? 'high' : 'medium',
        category: 'importance',
        relatedBriefId: brief.id,
      })
    }

    if (confidence >= 75) {
      alerts.push({
        title: 'High-confidence intelligence signal',
        message: `Brief "${brief.title}" reached ${confidence}% confidence with ${brief.clusterCount} fused clusters.`,
        severity: confidence >= 90 ? 'high' : 'medium',
        category: 'confidence',
        relatedBriefId: brief.id,
      })
    }

    if (hasCybersecurityContent(brief)) {
      const cyberSection = findSection(brief, 'cyber-security')
      alerts.push({
        title: 'Cybersecurity intelligence detected',
        message:
          cyberSection?.summary ||
          `Cybersecurity activity detected in brief "${brief.title}" with ${cyberSection?.articleCount ?? 0} supporting articles.`,
        severity: 'high',
        category: 'cybersecurity',
        relatedBriefId: brief.id,
      })
    }

    if (conflictingCount > 0) {
      alerts.push({
        title: 'Conflicting intelligence reports',
        message: `${conflictingCount} conflicting report cluster${conflictingCount === 1 ? '' : 's'} detected while processing "${brief.title}". Validate sources before action.`,
        severity: conflictingCount >= 3 ? 'critical' : 'high',
        category: 'conflicts',
        relatedBriefId: brief.id,
      })
    }

    return alerts
  }
}

export const briefAlertEngine = new BriefAlertEngine()

export function mapBriefRiskToAlertSeverity(riskLevel: IntelligenceDailyBrief['riskLevel']): AlertSeverity {
  switch (riskLevel) {
    case 'Critical':
      return 'critical'
    case 'High':
      return 'high'
    case 'Elevated':
      return 'medium'
    case 'Moderate':
      return 'low'
    default:
      return 'info'
  }
}
