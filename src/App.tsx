import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { GuestGuard } from '@/components/auth/GuestGuard'
import { AppShell } from '@/components/layout/AppShell'
import { ROUTES } from '@/lib/constants'
import { ArticleDetailPage } from '@/pages/ArticleDetailPage'
import { ArticlesPage } from '@/pages/ArticlesPage'
import { CreateArticlePage } from '@/pages/CreateArticlePage'
import { ConnectorsPage } from '@/pages/ConnectorsPage'
import { CreateSourcePage } from '@/pages/CreateSourcePage'
import { CreateVideoPage } from '@/pages/CreateVideoPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { EditSourcePage } from '@/pages/EditSourcePage'
import { LoginPage } from '@/pages/LoginPage'
import { SignUpPage } from '@/pages/SignUpPage'
import { SourceDetailPage } from '@/pages/SourceDetailPage'
import { SourcesPage } from '@/pages/SourcesPage'
import { QueuePage } from '@/pages/QueuePage'
import { SchedulerPage } from '@/pages/SchedulerPage'
import { VideoDetailPage } from '@/pages/VideoDetailPage'
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
            <Route path={ROUTES.ARTICLES_NEW} element={<CreateArticlePage />} />
            <Route path="/articles/:id" element={<ArticleDetailPage />} />
            <Route path={ROUTES.VIDEOS} element={<VideosPage />} />
            <Route path={ROUTES.VIDEOS_NEW} element={<CreateVideoPage />} />
            <Route path="/videos/:id" element={<VideoDetailPage />} />
            <Route path={ROUTES.SOURCES} element={<SourcesPage />} />
            <Route path={ROUTES.CONNECTORS} element={<ConnectorsPage />} />
            <Route path={ROUTES.SCHEDULER} element={<SchedulerPage />} />
            <Route path={ROUTES.QUEUE} element={<QueuePage />} />
            <Route path={ROUTES.SOURCES_NEW} element={<CreateSourcePage />} />
            <Route path="/sources/:id/edit" element={<EditSourcePage />} />
            <Route path="/sources/:id" element={<SourceDetailPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
