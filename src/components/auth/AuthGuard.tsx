import { Navigate, Outlet } from 'react-router-dom'
import { AuthLoading } from '@/components/common/AuthLoading'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/lib/constants'

export function AuthGuard() {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return <AuthLoading />
  }

  if (!session) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  return <Outlet />
}
