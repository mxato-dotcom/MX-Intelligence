import { buildEntityId } from '@/lib/entityId'
import type { EntityType } from '@/intelligence/entities/EntityType'

export const ROUTES = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/',
  ARTICLES: '/articles',
  ARTICLES_NEW: '/articles/new',
  VIDEOS: '/videos',
  VIDEOS_NEW: '/videos/new',
  SOURCES: '/sources',
  SOURCES_NEW: '/sources/new',
  CONNECTORS: '/connectors',
  SCHEDULER: '/scheduler',
  QUEUE: '/queue',
  ENTITIES: '/entities',
  ENTITIES_COMPARE: '/entities/compare',
  BRIEFS: '/briefs',
  ALERTS: '/alerts',
  TIMELINE: '/timeline',
  GRAPH: '/graph',
  SETTINGS: '/settings',
} as const

export function articleDetailPath(id: string): string {
  return `/articles/${id}`
}

export function videoDetailPath(id: string): string {
  return `/videos/${id}`
}

export function sourceDetailPath(id: string): string {
  return `/sources/${id}`
}

export function sourceEditPath(id: string): string {
  return `/sources/${id}/edit`
}

export function briefDetailPath(id: string): string {
  return `/briefs/${id}`
}

export function entityProfilePath(entityId: string): string {
  return `/entities/${encodeURIComponent(entityId)}`
}

export function entityDetailPath(entityType: EntityType, normalizedText: string): string {
  return entityProfilePath(buildEntityId(entityType, normalizedText))
}

export function entitiesComparePath(entityA?: string, entityB?: string): string {
  if (!entityA) {
    return ROUTES.ENTITIES_COMPARE
  }

  const params = new URLSearchParams({ a: entityA })
  if (entityB) {
    params.set('b', entityB)
  }

  return `${ROUTES.ENTITIES_COMPARE}?${params.toString()}`
}

export const NAV_ITEMS = [
  { label: 'Daily Brief', path: ROUTES.DASHBOARD },
  { label: 'Briefs', path: ROUTES.BRIEFS },
  { label: 'Alerts', path: ROUTES.ALERTS },
  { label: 'Timeline', path: ROUTES.TIMELINE },
  { label: 'Graph', path: ROUTES.GRAPH },
  { label: 'Articles', path: ROUTES.ARTICLES },
  { label: 'Videos', path: ROUTES.VIDEOS },
  { label: 'Sources', path: ROUTES.SOURCES },
  { label: 'Connectors', path: ROUTES.CONNECTORS },
  { label: 'Scheduler', path: ROUTES.SCHEDULER },
  { label: 'Queue', path: ROUTES.QUEUE },
  { label: 'Entities', path: ROUTES.ENTITIES },
  { label: 'Settings', path: ROUTES.SETTINGS },
] as const
