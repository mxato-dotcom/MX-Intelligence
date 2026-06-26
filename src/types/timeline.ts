import type { IntelligenceDailyBrief, BriefRiskLevel } from '@/intelligence/brief/BriefTypes'
import type { IntelligenceCluster } from '@/intelligence/fusion/FusionCluster'
import type { IntelligenceAlert, AlertSeverity } from '@/types/alert'
import type { Article } from '@/types/article'
import type { AggregatedEntity } from '@/services/entityService'

export type TimelineEventType = 'article' | 'entity' | 'alert' | 'cluster' | 'brief'

export interface TimelineEvent {
  id: string
  timestamp: string
  title: string
  description: string
  type: TimelineEventType
  importance: number
  confidence: number
  risk: BriefRiskLevel | 'Info' | 'Low' | 'Medium' | 'High' | 'Critical'
  source: string
  relatedArticles: string[]
  relatedEntities: string[]
  relatedCluster: string | null
  relatedBriefId?: string | null
  relatedAlertId?: string | null
}

export interface TimelineBuildInput {
  articles: Article[]
  clusters: IntelligenceCluster[]
  briefs: IntelligenceDailyBrief[]
  alerts: IntelligenceAlert[]
  entities: AggregatedEntity[]
}

export interface TimelineFilters {
  dateFrom?: string
  dateTo?: string
  risks?: string[]
  minConfidence?: number
  entity?: string
  source?: string
  technology?: string
  organization?: string
  types?: TimelineEventType[]
  clusterId?: string
}

export interface TimelineProvider {
  buildEvents(input: TimelineBuildInput): TimelineEvent[]
  correlateEvents(events: TimelineEvent[]): TimelineEvent[]
}

export const TIMELINE_EVENT_TYPES: TimelineEventType[] = [
  'article',
  'entity',
  'alert',
  'cluster',
  'brief',
]

export const TIMELINE_RISK_OPTIONS = [
  'Low',
  'Moderate',
  'Elevated',
  'High',
  'Critical',
  'Info',
  'Medium',
] as const

export function parseTimestamp(value: string | null | undefined, fallback?: string): string {
  const candidate = value?.trim() || fallback?.trim() || ''
  if (!candidate) {
    return new Date().toISOString()
  }

  const date = new Date(candidate)
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

export function alertSeverityToRisk(severity: AlertSeverity): TimelineEvent['risk'] {
  switch (severity) {
    case 'critical':
      return 'Critical'
    case 'high':
      return 'High'
    case 'medium':
      return 'Moderate'
    case 'low':
      return 'Low'
    default:
      return 'Info'
  }
}

export function alertSeverityToImportance(severity: AlertSeverity): number {
  switch (severity) {
    case 'critical':
      return 95
    case 'high':
      return 80
    case 'medium':
      return 60
    case 'low':
      return 40
    default:
      return 25
  }
}

export function clusterAgreementToRisk(cluster: IntelligenceCluster): BriefRiskLevel {
  switch (cluster.agreement) {
    case 'Conflicting':
      return 'High'
    case 'Confirmed':
      return 'Moderate'
    case 'Likely':
      return 'Low'
    default:
      return 'Low'
  }
}
