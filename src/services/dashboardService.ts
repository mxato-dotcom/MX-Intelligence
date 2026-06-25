import { supabase } from '@/lib/supabase'
import type { Article } from '@/types/article'
import type { DailyBrief, DailyBriefRow } from '@/types/brief'
import type { Video } from '@/types/video'

export interface DashboardStats {
  totalArticles: number
  totalVideos: number
  totalBriefs: number
}

function mapDailyBrief(row: DailyBriefRow): DailyBrief {
  return {
    id: row.id,
    title: row.title ?? null,
    content: row.content ?? row.summary ?? '',
    created_at: row.created_at,
  }
}

export async function getLatestArticles(limit = 5): Promise<Article[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  return data as Article[]
}

export async function getLatestVideos(limit = 5): Promise<Video[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  return data as Video[]
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [articlesResult, videosResult, briefsResult] = await Promise.all([
    supabase.from('articles').select('*', { count: 'exact', head: true }),
    supabase.from('videos').select('*', { count: 'exact', head: true }),
    supabase.from('daily_briefs').select('*', { count: 'exact', head: true }),
  ])

  if (articlesResult.error) {
    throw articlesResult.error
  }

  if (videosResult.error) {
    throw videosResult.error
  }

  if (briefsResult.error) {
    throw briefsResult.error
  }

  return {
    totalArticles: articlesResult.count ?? 0,
    totalVideos: videosResult.count ?? 0,
    totalBriefs: briefsResult.count ?? 0,
  }
}

export async function getLatestDailyBrief(): Promise<DailyBrief | null> {
  const { data, error } = await supabase
    .from('daily_briefs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  return mapDailyBrief(data as DailyBriefRow)
}

export function generatePlaceholderBrief(articles: Article[], videos: Video[]): string {
  if (articles.length === 0 && videos.length === 0) {
    return 'No intelligence items yet. Add articles and videos to build your daily brief.'
  }

  const parts: string[] = []

  if (articles.length > 0) {
    const titles = articles.slice(0, 3).map((article) => article.title).join(', ')
    parts.push(
      `Latest articles (${articles.length}): ${titles}${articles.length > 3 ? ', and more' : ''}.`,
    )
  }

  if (videos.length > 0) {
    const titles = videos.slice(0, 3).map((video) => video.title).join(', ')
    parts.push(
      `Latest videos (${videos.length}): ${titles}${videos.length > 3 ? ', and more' : ''}.`,
    )
  }

  return parts.join(' ')
}
