import type { BriefStatus } from '@/intelligence/brief/BriefTypes'

export function briefStatusLabel(status: BriefStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft'
    case 'reviewed':
      return 'Reviewed'
    case 'published':
      return 'Published'
    case 'archived':
      return 'Archived'
    default:
      return 'Draft'
  }
}

export function briefStatusClass(status: BriefStatus): string {
  switch (status) {
    case 'draft':
      return 'statusDraft'
    case 'reviewed':
      return 'statusReviewed'
    case 'published':
      return 'statusPublished'
    case 'archived':
      return 'statusArchived'
    default:
      return 'statusDraft'
  }
}
