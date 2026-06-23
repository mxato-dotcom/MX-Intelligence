import { PageContainer } from '@/components/layout/PageContainer'
import styles from './PlaceholderPage.module.css'

export function ArticlesPage() {
  return (
    <PageContainer
      title="Articles"
      description="Browse curated articles with filters for source, tags, and read status."
    >
      <div className={styles.placeholder}>
        <p>Article list and filters will be implemented in Phase 4.</p>
      </div>
    </PageContainer>
  )
}
