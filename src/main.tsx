import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AuthProvider } from '@/contexts/AuthContext'
import { DataRefreshProvider } from '@/contexts/DataRefreshContext'
import { QueueProvider } from '@/contexts/QueueContext'
import { ToastProvider } from '@/contexts/ToastContext'
import './styles/globals.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <DataRefreshProvider>
        <ToastProvider>
          <QueueProvider>
            <App />
          </QueueProvider>
        </ToastProvider>
      </DataRefreshProvider>
    </AuthProvider>
  </StrictMode>,
)
