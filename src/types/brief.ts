export type {
  BriefRiskLevel,
  BriefSectionData,
  BriefSectionId,
  IntelligenceBriefPayload,
  IntelligenceDailyBrief,
} from '@/intelligence/brief/BriefTypes'

/** @deprecated Use IntelligenceDailyBrief from dailyBriefService instead */
export interface DailyBrief {
  id: string
  title: string | null
  content: string
  created_at: string
}

export interface DailyBriefRow {
  id: string
  title?: string | null
  content?: string | null
  summary?: string | null
  created_at: string
}
