import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { queueManager } from '@/intelligence/queue/QueueManager'
import {
  computeQueueStats,
  getQueueSnapshot,
  subscribeQueue,
} from '@/intelligence/queue/queueService'
import type { QueueSnapshot, QueueStats } from '@/intelligence/queue/types'
import { useDataRefresh } from '@/contexts/DataRefreshContext'

interface QueueContextValue {
  snapshot: QueueSnapshot
  stats: QueueStats
  refresh: () => void
  processQueue: () => Promise<void>
}

const QueueContext = createContext<QueueContextValue | null>(null)

export function QueueProvider({ children }: { children: ReactNode }) {
  const { notifyDataRefresh } = useDataRefresh()
  const [snapshot, setSnapshot] = useState<QueueSnapshot>(() => getQueueSnapshot())

  const refresh = useCallback(() => {
    setSnapshot(getQueueSnapshot())
  }, [])

  useEffect(() => {
    queueManager.setRefreshHandler(() => {
      notifyDataRefresh()
      refresh()
    })

    return subscribeQueue(refresh)
  }, [notifyDataRefresh, refresh])

  const processQueue = useCallback(async () => {
    await queueManager.processNext()
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
