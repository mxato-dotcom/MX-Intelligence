export const SOURCE_TYPES = [
  'RSS',
  'Website',
  'YouTube',
  'X',
  'GitHub',
  'News API',
  'Research',
  'Government',
  'Custom API',
] as const

export const SOURCE_CATEGORIES = [
  'AI',
  'Cybersecurity',
  'Programming',
  'Technology',
  'Business',
  'Finance',
  'Crypto',
  'Politics',
  'Sports',
  'Health',
  'Science',
  'Education',
  'Islamic Studies',
  'Space',
] as const

export const SOURCE_STATUSES = ['enabled', 'disabled'] as const

export const SOURCE_PRIORITIES = ['low', 'medium', 'high'] as const

export type SourceType = (typeof SOURCE_TYPES)[number]
export type SourceCategory = (typeof SOURCE_CATEGORIES)[number]
export type SourceStatus = (typeof SOURCE_STATUSES)[number]
export type SourcePriority = (typeof SOURCE_PRIORITIES)[number]

export interface Source {
  id: string
  user_id: string
  source_type: string
  name: string
  url: string
  active: boolean
  created_at: string
  category: string
  description: string
  status: string
  priority: string
  update_interval: string
  trust_score: number
  last_sync_at: string | null
  items_collected: number | null
}

export interface CreateSourceInput {
  name: string
  source_type: string
  category: string
  url: string
  description: string
  status: string
  priority: string
  update_interval: string
  trust_score: number
  active: boolean
}

export type UpdateSourceInput = Partial<CreateSourceInput>

export const DEFAULT_SOURCE_VALUES: CreateSourceInput = {
  name: '',
  source_type: 'RSS',
  category: 'Technology',
  url: '',
  description: '',
  status: 'enabled',
  priority: 'medium',
  update_interval: '24h',
  trust_score: 80,
  active: true,
}
