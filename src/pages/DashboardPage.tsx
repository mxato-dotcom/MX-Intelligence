import { PageContainer } from '@/components/layout/PageContainer'
import styles from './PlaceholderPage.module.css'

export function DashboardPage() {
  return (
    <PageContainer
      title="Daily Brief"
      description="Your curated intelligence for today — articles, videos, and highlights."
    >
      <div className={styles.placeholder}>
        <p>Daily brief content will appear here in Phase 6.</p>
        <ul className={styles.list}>
          <li>Top articles today</li>
          <li>Videos to watch</li>
          <li>Quick stats and read progress</li>
        </ul>
      </div>
    </PageContainer>
  )
}
