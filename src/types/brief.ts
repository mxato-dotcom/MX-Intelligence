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
