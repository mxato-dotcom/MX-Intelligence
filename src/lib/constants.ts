export const ROUTES = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/',
  ARTICLES: '/articles',
  ARTICLES_NEW: '/articles/new',
  VIDEOS: '/videos',
} as const

export function articleDetailPath(id: string): string {
  return `/articles/${id}`
}

export const NAV_ITEMS = [
  { label: 'Daily Brief', path: ROUTES.DASHBOARD },
  { label: 'Articles', path: ROUTES.ARTICLES },
  { label: 'Videos', path: ROUTES.VIDEOS },
] as const
