import { supabase } from '@/lib/supabase'
import type { Article, CreateArticleInput } from '@/types/article'

export async function getArticles(): Promise<Article[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .order('published_at', { ascending: false })

  if (error) {
    throw error
  }

  return data as Article[]
}

export async function getArticleById(id: string): Promise<Article | null> {
  const { data, error } = await supabase.from('articles').select('*').eq('id', id).maybeSingle()

  if (error) {
    throw error
  }

  return data as Article | null
}

export async function createArticle(input: CreateArticleInput, userId: string): Promise<Article> {
  const { data, error } = await supabase
    .from('articles')
    .insert({
      title: input.title.trim(),
      source: input.source.trim(),
      url: input.url.trim(),
      content: input.content.trim(),
      summary: input.summary.trim(),
      category: input.category.trim(),
      created_by: userId,
      published_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as Article
}
