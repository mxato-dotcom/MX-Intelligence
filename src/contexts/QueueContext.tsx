import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { queueManager } from '@/intelligence/queue/QueueManager'
import {
  computeQueueStats,
  getQueueSnapshot,
  subscribeQueue,
} from '@/intelligence/queue/queueService'
import type { QueueSnapshot, QueueStats, SyncNotificationEvent } from '@/intelligence/queue/types'
import { useDataRefresh } from '@/contexts/DataRefreshContext'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/hooks/useAuth'
import {
  getSchedulerRuntimeState,
  runSchedulerTick,
  setMaxConcurrentJobs,
} from '@/services/backgroundSyncService'

interface QueueContextValue {
  snapshot: QueueSnapshot
  stats: QueueStats
  refresh: () => void
  processQueue: () => Promise<void>
}

const QueueContext = createContext<QueueContextValue | null>(null)

function notificationToast(event: SyncNotificationEvent): { message: string; variant: 'success' | 'error' | 'info' } {
  const prefix = event.sourceName ? `${event.sourceName}: ` : ''

  switch (event.kind) {
    case 'sync_started':
      return { message: `${prefix}Sync started`, variant: 'info' }
    case 'sync_completed':
      return { message: `${prefix}${event.message ?? 'Sync completed'}`, variant: 'success' }
    case 'sync_failed':
      return { message: `${prefix}${event.message ?? 'Sync failed'}`, variant: 'error' }
    case 'retry_started':
      return { message: `${prefix}${event.message ?? 'Retry scheduled'}`, variant: 'info' }
    case 'retry_successful':
      return { message: `${prefix}Retry successful`, variant: 'success' }
    case 'retry_failed':
      return { message: `${prefix}Retry failed`, variant: 'error' }
    case 'provider_offline':
      return { message: `${prefix}Provider offline`, variant: 'error' }
    case 'rate_limited':
      return { message: `${prefix}Rate limited`, variant: 'error' }
    case 'auth_failed':
      return { message: `${prefix}Authentication failed`, variant: 'error' }
    default:
      return { message: `${prefix}Sync update`, variant: 'info' }
  }
}

export function QueueProvider({ children }: { children: ReactNode }) {
  const { notifyDataRefresh } = useDataRefresh()
  const { showToast } = useToast()
  const { user } = useAuth()
  const [snapshot, setSnapshot] = useState<QueueSnapshot>(() => getQueueSnapshot())

  const refresh = useCallback(() => {
    setSnapshot(getQueueSnapshot())
  }, [])

  useEffect(() => {
    const runtime = getSchedulerRuntimeState()
    setMaxConcurrentJobs(runtime.maxConcurrentJobs)

    queueManager.setRefreshHandler(() => {
      notifyDataRefresh()
      refresh()
    })

    queueManager.setNotificationHandler((event) => {
      const { message, variant } = notificationToast(event)
      showToast(message, variant)
    })

    return subscribeQueue(refresh)
  }, [notifyDataRefresh, refresh, showToast])

  useEffect(() => {
    if (!user?.id) {
      return
    }

    const tick = async () => {
      try {
        await runSchedulerTick(user.id)
        refresh()
      } catch {
        // Automatic scheduling should not crash the app
      }
    }

    const intervalId = window.setInterval(tick, 60_000)
    tick()

    return () => window.clearInterval(intervalId)
  }, [user?.id, refresh])

  const processQueue = useCallback(async () => {
    await queueManager.processQueue()
    refresh()
  }, [refresh])

  const stats = useMemo(() => computeQueueStats(snapshot.jobs), [snapshot.jobs])

  const value = useMemo(
    () => ({
      snapshot,
      stats,
      refresh,
      processQueue,
    }),
    [snapshot, stats, refresh, processQueue],
  )

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>
}

export function useQueue() {
  const context = useContext(QueueContext)
  if (!context) {
    throw new Error('useQueue must be used within QueueProvider')
  }
  return context
}
