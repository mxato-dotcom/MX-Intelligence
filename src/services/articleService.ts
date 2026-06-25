import { supabase } from '@/lib/supabase'
import type { NormalizedIntelligenceArticle } from '@/intelligence/types'
import type { Article, CreateArticleInput } from '@/types/article'

export interface ArticleImportResult {
  imported: number
  skipped: number
  failed: number
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase()
}

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
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('articles')
    .insert({
      title: input.title.trim(),
      source: input.source.trim(),
      url: input.url.trim(),
      content: input.content.trim(),
      summary: input.summary.trim(),
      category: input.category.trim(),
      image_url: input.image_url ?? null,
      created_by: userId,
      published_at: input.published_at ?? now,
      created_at: now,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as Article
}

async function getExistingArticleMatches(
  urls: string[],
  titles: string[],
): Promise<{ urls: Set<string>; titles: Set<string> }> {
  const existingUrls = new Set<string>()
  const existingTitles = new Set<string>()

  const uniqueUrls = [...new Set(urls.filter(Boolean))]
  const uniqueTitles = [...new Set(titles.map((title) => title.trim()).filter(Boolean))]

  if (uniqueUrls.length > 0) {
    const { data, error } = await supabase.from('articles').select('url').in('url', uniqueUrls)

    if (error) {
      throw error
    }

    for (const row of data ?? []) {
      existingUrls.add(row.url as string)
    }
  }

  if (uniqueTitles.length > 0) {
    const { data, error } = await supabase.from('articles').select('title').in('title', uniqueTitles)

    if (error) {
      throw error
    }

    for (const row of data ?? []) {
      existingTitles.add(normalizeTitle(row.title as string))
    }
  }

  return { urls: existingUrls, titles: existingTitles }
}

export async function importNormalizedArticles(
  items: NormalizedIntelligenceArticle[],
  userId: string,
): Promise<ArticleImportResult> {
  if (items.length === 0) {
    return { imported: 0, skipped: 0, failed: 0 }
  }

  const existing = await getExistingArticleMatches(
    items.map((item) => item.url),
    items.map((item) => item.title),
  )

  const seenUrls = new Set<string>()
  const seenTitles = new Set<string>()

  let imported = 0
  let skipped = 0
  let failed = 0

  for (const item of items) {
    const normalizedTitle = normalizeTitle(item.title)
    const normalizedUrl = item.url.trim()

    if (
      existing.urls.has(normalizedUrl) ||
      existing.titles.has(normalizedTitle) ||
      seenUrls.has(normalizedUrl) ||
      seenTitles.has(normalizedTitle)
    ) {
      skipped += 1
      continue
    }

    const now = new Date().toISOString()
    const summary = item.summary.trim() || item.content.trim().slice(0, 280)
    const content = item.content.trim() || summary

    try {
      const { error } = await supabase.from('articles').insert({
        title: item.title.trim() || 'Untitled',
        source: item.source.trim(),
        url: normalizedUrl,
        content,
        summary,
        category: item.category.trim() || 'Uncategorized',
        image_url: item.image ?? null,
        published_at: item.published_at || now,
        created_at: now,
        created_by: userId,
      })

      if (error) {
        if (error.code === '23505') {
          skipped += 1
          existing.urls.add(normalizedUrl)
          existing.titles.add(normalizedTitle)
        } else {
          failed += 1
        }
        continue
      }

      imported += 1
      seenUrls.add(normalizedUrl)
      seenTitles.add(normalizedTitle)
      existing.urls.add(normalizedUrl)
      existing.titles.add(normalizedTitle)
    } catch {
      failed += 1
    }
  }

  return { imported, skipped, failed }
}
