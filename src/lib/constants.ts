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

export const NAV_ITEMS = [
  { label: 'Daily Brief', path: ROUTES.DASHBOARD },
  { label: 'Articles', path: ROUTES.ARTICLES },
  { label: 'Videos', path: ROUTES.VIDEOS },
  { label: 'Sources', path: ROUTES.SOURCES },
  { label: 'Connectors', path: ROUTES.CONNECTORS },
  { label: 'Scheduler', path: ROUTES.SCHEDULER },
] as const
