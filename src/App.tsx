import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { GuestGuard } from '@/components/auth/GuestGuard'
import { AppShell } from '@/components/layout/AppShell'
import { ROUTES } from '@/lib/constants'
import { ArticlesPage } from '@/pages/ArticlesPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'
import { SignUpPage } from '@/pages/SignUpPage'
import { VideosPage } from '@/pages/VideosPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<GuestGuard />}>
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.SIGNUP} element={<SignUpPage />} />
        </Route>

        <Route element={<AuthGuard />}>
          <Route element={<AppShell />}>
            <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
            <Route path={ROUTES.ARTICLES} element={<ArticlesPage />} />
            <Route path={ROUTES.VIDEOS} element={<VideosPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
