import { PageContainer } from '@/components/layout/PageContainer'
import styles from './PlaceholderPage.module.css'

export function VideosPage() {
  return (
    <PageContainer
      title="Videos"
      description="Discover videos with thumbnails, duration, and watch tracking."
    >
      <div className={styles.placeholder}>
        <p>Video grid and filters will be implemented in Phase 5.</p>
      </div>
    </PageContainer>
  )
}
