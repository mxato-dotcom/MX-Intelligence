import { supabase } from '@/lib/supabase'
import type { IntelligenceItem } from '@/intelligence/types/IntelligenceItem'

export interface ImportEngineResult {
  imported: number
  skipped: number
  failed: number
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase()
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

export async function importIntelligenceItems(
  items: IntelligenceItem[],
  userId: string,
): Promise<ImportEngineResult> {
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
        source: item.sourceName.trim(),
        url: normalizedUrl,
        content,
        summary,
        category: item.category.trim() || 'Uncategorized',
        image_url: item.imageUrl ?? null,
        published_at: item.publishedAt || now,
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
