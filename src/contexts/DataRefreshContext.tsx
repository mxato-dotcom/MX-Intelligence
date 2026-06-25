import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

interface DataRefreshContextValue {
  refreshToken: number
  notifyDataRefresh: () => void
}

const DataRefreshContext = createContext<DataRefreshContextValue | null>(null)

export function DataRefreshProvider({ children }: { children: ReactNode }) {
  const [refreshToken, setRefreshToken] = useState(0)

  const notifyDataRefresh = useCallback(() => {
    setRefreshToken((current) => current + 1)
  }, [])

  const value = useMemo(
    () => ({ refreshToken, notifyDataRefresh }),
    [refreshToken, notifyDataRefresh],
  )

  return <DataRefreshContext.Provider value={value}>{children}</DataRefreshContext.Provider>
}

export function useDataRefresh() {
  const context = useContext(DataRefreshContext)
  if (!context) {
    throw new Error('useDataRefresh must be used within DataRefreshProvider')
  }
  return context
}
