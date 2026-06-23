import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { NAV_ITEMS, ROUTES } from '@/lib/constants'
import styles from './AppShell.module.css'

export function AppShell() {
  const { user, profile, signOut } = useAuth()
  const displayLabel = profile?.display_name || user?.email || 'Account'

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch {
      // Auth state listener will clear session; ignore transient errors
    }
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>MX</span>
          <span className={styles.brandText}>Intelligence</span>
        </div>
        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === ROUTES.DASHBOARD}
              className={({ isActive }) =>
                isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.headerTitle}>MX Intelligence</h1>
          <div className={styles.headerActions}>
            <span className={styles.userLabel}>{displayLabel}</span>
            <button className={styles.signOutButton} type="button" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </header>
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
