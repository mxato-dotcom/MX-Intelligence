export const ROUTES = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/',
  ARTICLES: '/articles',
  VIDEOS: '/videos',
} as const

export const NAV_ITEMS = [
  { label: 'Daily Brief', path: ROUTES.DASHBOARD },
  { label: 'Articles', path: ROUTES.ARTICLES },
  { label: 'Videos', path: ROUTES.VIDEOS },
] as const
