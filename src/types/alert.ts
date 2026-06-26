export type AlertSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical'

export type AlertStatus = 'unread' | 'read' | 'archived'

export const ALERT_SEVERITIES: AlertSeverity[] = ['info', 'low', 'medium', 'high', 'critical']

export const ALERT_STATUSES: AlertStatus[] = ['unread', 'read', 'archived']

export interface IntelligenceAlert {
  id: string
  title: string
  message: string
  severity: AlertSeverity
  category: string
  relatedBriefId: string | null
  relatedArticleId: string | null
  relatedEntity: string | null
  createdAt: string
  readAt: string | null
  status: AlertStatus
}

export interface CreateAlertInput {
  title: string
  message: string
  severity: AlertSeverity
  category: string
  relatedBriefId?: string | null
  relatedArticleId?: string | null
  relatedEntity?: string | null
}

export interface AlertStats {
  total: number
  unread: number
  critical: number
  high: number
  archived: number
}

export interface AlertRow {
  id: string
  user_id: string
  title: string
  message: string
  severity?: string | null
  category?: string | null
  related_brief_id?: string | null
  related_article_id?: string | null
  related_entity?: string | null
  status?: string | null
  read_at?: string | null
  created_at?: string | null
}
