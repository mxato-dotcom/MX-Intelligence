export interface Video {
  id: string
  title: string
  source: string
  url: string
  thumbnail_url: string | null
  description: string
  category: string
  created_by: string
  created_at: string
}

export interface CreateVideoInput {
  title: string
  source: string
  url: string
  thumbnail_url: string
  description: string
  category: string
}
