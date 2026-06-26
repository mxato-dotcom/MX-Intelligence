import { ROUTES } from '@/lib/constants'
import { Link } from 'react-router-dom'
import styles from './SecurityFooter.module.css'

export function SecurityFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <div className={styles.icon} aria-hidden="true">🛡</div>
        <div>
          <h3 className={styles.title}>Security First</h3>
          <p className={styles.text}>
            All credentials are encrypted and stored securely. They are never exposed in the
            browser and are only used server-side via secure Edge Functions.
          </p>
        </div>
      </div>
      <Link to={ROUTES.SETTINGS} className={styles.link}>
        Learn more about security
        <span aria-hidden="true">↗</span>
      </Link>
    </footer>
  )
}
