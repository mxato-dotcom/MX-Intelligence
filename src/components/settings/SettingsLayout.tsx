import type { ReactNode } from 'react'
import { ConnectorLogo } from '@/components/settings/ConnectorLogo'
import type { ConnectorId } from '@/types/connectorSettings'
import styles from './SettingsLayout.module.css'

export interface SettingsNavItem {
  id: string
  label: string
  connectorId?: ConnectorId
  isDashboard?: boolean
}

interface SettingsLayoutProps {
  items: SettingsNavItem[]
  activeId: string
  onNavigate: (id: string) => void
  children: ReactNode
  footer?: ReactNode
}

export function SettingsLayout({
  items,
  activeId,
  onNavigate,
  children,
  footer,
}: SettingsLayoutProps) {
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <p className={styles.sidebarTitle}>Connectors</p>
        <ul className={styles.navList}>
          {items.map((item) => {
            const isActive = activeId === item.id

            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={
                    isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem
                  }
                  onClick={() => onNavigate(item.id)}
                >
                  {item.isDashboard ? (
                    <span className={styles.dashboardIcon} aria-hidden="true">▦</span>
                  ) : item.connectorId ? (
                    <ConnectorLogo connectorId={item.connectorId} />
                  ) : null}
                  <span className={styles.navLabel}>{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </aside>
      <div className={styles.content}>
        {children}
        {footer}
      </div>
    </div>
  )
}
