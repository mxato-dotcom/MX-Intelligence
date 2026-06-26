import { safeString, safeStringOr } from '@/lib/safeString'
import type { Article } from '@/types/article'

export function normalizeArticle(row: Record<string, unknown>): Article {
  const publishedAt = safeString(row.published_at as string | null | undefined)
  const createdAt = safeString(row.created_at as string | null | undefined)

  return {
    id: safeString(row.id as string | null | undefined),
    title: safeStringOr(row.title as string | null | undefined, 'Untitled'),
    source: safeStringOr(row.source as string | null | undefined, 'Unknown source'),
    url: safeString(row.url as string | null | undefined),
    content: safeString(row.content as string | null | undefined),
    summary: safeString(row.summary as string | null | undefined),
    category: safeStringOr(row.category as string | null | undefined, 'Uncategorized'),
    image_url: (row.image_url as string | null | undefined) ?? null,
    published_at: publishedAt || createdAt || new Date().toISOString(),
    created_at: createdAt || publishedAt || new Date().toISOString(),
    created_by: safeString(row.created_by as string | null | undefined),
  }
}

export function normalizeArticles(rows: Record<string, unknown>[]): Article[] {
  return rows.map((row) => normalizeArticle(row))
}
