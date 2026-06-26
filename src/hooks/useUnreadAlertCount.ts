import { useEffect, useState } from 'react'
import { useDataRefresh } from '@/contexts/DataRefreshContext'
import { getUnreadAlertCount } from '@/services/alertService'

export function useUnreadAlertCount() {
  const { refreshToken } = useDataRefresh()
  const [count, setCount] = useState(0)

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      try {
        const unreadCount = await getUnreadAlertCount()
        if (isMounted) {
          setCount(unreadCount)
        }
      } catch {
        if (isMounted) {
          setCount(0)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [refreshToken])

  return count
}
