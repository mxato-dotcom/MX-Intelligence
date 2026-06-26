import { getOrderedBriefSections } from '@/intelligence/brief/BriefGenerator'
import { briefStatusLabel } from '@/intelligence/brief/briefStatus'
import type { IntelligenceDailyBrief } from '@/intelligence/brief/BriefTypes'
import type { IntelligenceCluster } from '@/intelligence/fusion/FusionCluster'
import { formatDate } from '@/lib/format'
import { safeStringOr } from '@/lib/safeString'
import type { Article } from '@/types/article'

export interface BriefExportInput {
  brief: IntelligenceDailyBrief
  relatedArticles: Article[]
  relatedClusters: IntelligenceCluster[]
}

export interface ExportedBriefJson {
  title: string
  summary: string
  executiveSummary: string
  status: string
  riskLevel: string
  importanceScore: number
  confidenceScore: number
  articleCount: number
  clusterCount: number
  entityCount: number
  generatedAt: string
  reviewedAt: string | null
  publishedAt: string | null
  archivedAt: string | null
  highlights: {
    topEvent: string | null
    topTechnology: string | null
    topOrganization: string | null
    topCountry: string | null
  }
  sections: Array<{
    title: string
    summary: string
    articleCount: number
    confidenceScore: number
    entityLabels: string[]
  }>
  sourcesUsed: Array<{ sourceName: string; articleCount: number }>
  relatedEntities: Array<{ type: string; label: string; count: number }>
  relatedArticles: Array<{
    title: string
    source: string
    url: string
    category: string
    summary: string
    publishedAt: string
  }>
  relatedClusters: Array<{
    title: string
    summary: string
    category: string
    reportCount: number
    confidenceScore: number
    agreement: string
    contributingSources: string[]
  }>
  exportedAt: string
}

export function sanitizeFileName(name: string): string {
  const sanitized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

  return sanitized || 'intelligence-brief'
}

export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

export function downloadTextFile(content: string, filename: string, mimeType = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function buildExportedJson(input: BriefExportInput): ExportedBriefJson {
  const { brief, relatedArticles, relatedClusters } = input
  const sections = getOrderedBriefSections(brief.payload.sections)

  return {
    title: brief.title,
    summary: brief.summary,
    executiveSummary: brief.executiveSummary,
    status: briefStatusLabel(brief.status),
    riskLevel: brief.riskLevel,
    importanceScore: brief.importanceScore,
    confidenceScore: brief.payload.overallConfidence,
    articleCount: brief.articleCount,
    clusterCount: brief.clusterCount,
    entityCount: brief.entityCount,
    generatedAt: brief.generatedAt,
    reviewedAt: brief.reviewedAt,
    publishedAt: brief.publishedAt,
    archivedAt: brief.archivedAt,
    highlights: {
      topEvent: brief.payload.topEvent?.value ?? null,
      topTechnology: brief.payload.topTechnology?.value ?? null,
      topOrganization: brief.payload.topOrganization?.value ?? null,
      topCountry: brief.payload.topCountry?.value ?? null,
    },
    sections: sections.map((section) => ({
      title: section.title,
      summary: section.summary,
      articleCount: section.articleCount,
      confidenceScore: section.confidenceScore,
      entityLabels: section.entityLabels,
    })),
    sourcesUsed: brief.payload.sourcesUsed.map((source) => ({
      sourceName: source.sourceName,
      articleCount: source.articleCount,
    })),
    relatedEntities: brief.payload.relatedEntities.map((entity) => ({
      type: entity.type,
      label: entity.label,
      count: entity.count,
    })),
    relatedArticles: relatedArticles.map((article) => ({
      title: safeStringOr(article.title, 'Untitled'),
      source: safeStringOr(article.source, 'Unknown source'),
      url: safeStringOr(article.url, ''),
      category: safeStringOr(article.category, 'Uncategorized'),
      summary: safeStringOr(article.summary, ''),
      publishedAt: safeStringOr(article.published_at, ''),
    })),
    relatedClusters: relatedClusters.map((cluster) => ({
      title: cluster.mainTitle,
      summary: cluster.summary,
      category: cluster.category,
      reportCount: cluster.reportCount,
      confidenceScore: cluster.confidenceScore,
      agreement: cluster.agreement,
      contributingSources: cluster.contributingSources,
    })),
    exportedAt: new Date().toISOString(),
  }
}

export function briefToJson(input: BriefExportInput): string {
  return JSON.stringify(buildExportedJson(input), null, 2)
}

function markdownSection(title: string, body: string): string {
  return `## ${title}\n\n${body.trim()}\n`
}

export function briefToMarkdown(input: BriefExportInput): string {
  const { brief, relatedArticles, relatedClusters } = input
  const sections = getOrderedBriefSections(brief.payload.sections)
  const lines: string[] = []

  lines.push(`# ${brief.title}`, '')
  lines.push(
    `- **Status:** ${briefStatusLabel(brief.status)}`,
    `- **Generated:** ${formatDate(brief.generatedAt)}`,
    `- **Risk level:** ${brief.riskLevel}`,
    `- **Importance score:** ${brief.importanceScore}%`,
    `- **Confidence score:** ${brief.payload.overallConfidence}%`,
    `- **Articles analyzed:** ${brief.articleCount}`,
    `- **Clusters analyzed:** ${brief.clusterCount}`,
    `- **Entities analyzed:** ${brief.entityCount}`,
    '',
  )

  if (brief.reviewedAt) {
    lines.push(`- **Reviewed:** ${formatDate(brief.reviewedAt)}`)
  }
  if (brief.publishedAt) {
    lines.push(`- **Published:** ${formatDate(brief.publishedAt)}`)
  }
  if (brief.archivedAt) {
    lines.push(`- **Archived:** ${formatDate(brief.archivedAt)}`)
  }
  lines.push('')

  lines.push(markdownSection('Executive Summary', brief.executiveSummary))

  if (brief.summary && brief.summary !== brief.executiveSummary) {
    lines.push(markdownSection('Brief Summary', brief.summary))
  }

  for (const section of sections) {
    const sectionBody = [
      section.summary,
      '',
      `_Supporting articles: ${section.articleCount} · Confidence: ${section.confidenceScore}%_`,
    ]
    if (section.entityLabels.length > 0) {
      sectionBody.push('', `Notable entities: ${section.entityLabels.join(', ')}`)
    }
    lines.push(markdownSection(section.title, sectionBody.join('\n')))
  }

  if (brief.payload.sourcesUsed.length > 0) {
    const sourceLines = brief.payload.sourcesUsed.map(
      (source) => `- ${source.sourceName}: ${source.articleCount} articles`,
    )
    lines.push(markdownSection('Source Breakdown', sourceLines.join('\n')))
  }

  if (relatedArticles.length > 0) {
    const articleLines = relatedArticles.map((article) => {
      const title = safeStringOr(article.title, 'Untitled')
      const source = safeStringOr(article.source, 'Unknown source')
      const url = safeStringOr(article.url, '')
      const line = url ? `- [${title}](${url}) — ${source}` : `- ${title} — ${source}`
      return line
    })
    lines.push(markdownSection('Related Articles', articleLines.join('\n')))
  }

  if (brief.payload.relatedEntities.length > 0) {
    const entityLines = brief.payload.relatedEntities.map(
      (entity) => `- ${entity.label} (${entity.type}, ${entity.count} mentions)`,
    )
    lines.push(markdownSection('Related Entities', entityLines.join('\n')))
  }

  if (relatedClusters.length > 0) {
    const clusterLines = relatedClusters.map((cluster) => {
      const parts = [
        `### ${cluster.mainTitle}`,
        cluster.summary,
        `_Reports: ${cluster.reportCount} · Confidence: ${cluster.confidenceScore}% · Agreement: ${cluster.agreement}_`,
      ]
      if (cluster.contributingSources.length > 0) {
        parts.push(`Sources: ${cluster.contributingSources.join(', ')}`)
      }
      return parts.join('\n')
    })
    lines.push(markdownSection('Related Clusters', clusterLines.join('\n\n')))
  }

  lines.push('---', `_Exported ${formatDate(new Date().toISOString())}_`, '')

  return lines.join('\n')
}

export function getBriefExportBaseName(brief: IntelligenceDailyBrief): string {
  return sanitizeFileName(brief.title)
}

export function downloadBriefMarkdown(input: BriefExportInput): void {
  const markdown = briefToMarkdown(input)
  const baseName = getBriefExportBaseName(input.brief)
  downloadTextFile(markdown, `${baseName}.md`, 'text/markdown;charset=utf-8')
}

export function downloadBriefJson(input: BriefExportInput): void {
  const json = briefToJson(input)
  const baseName = getBriefExportBaseName(input.brief)
  downloadTextFile(json, `${baseName}.json`, 'application/json;charset=utf-8')
}
