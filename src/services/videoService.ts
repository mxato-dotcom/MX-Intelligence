import { supabase } from '@/lib/supabase'
import type { CreateVideoInput, Video } from '@/types/video'

export async function getVideos(): Promise<Video[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data as Video[]
}

export async function getVideo(id: string): Promise<Video | null> {
  const { data, error } = await supabase.from('videos').select('*').eq('id', id).maybeSingle()

  if (error) {
    throw error
  }

  return data as Video | null
}

export async function createVideo(input: CreateVideoInput, userId: string): Promise<Video> {
  const { data, error } = await supabase
    .from('videos')
    .insert({
      title: input.title.trim(),
      source: input.source.trim(),
      url: input.url.trim(),
      thumbnail_url: input.thumbnail_url.trim() || null,
      description: input.description.trim(),
      category: input.category.trim(),
      created_by: userId,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as Video
}
