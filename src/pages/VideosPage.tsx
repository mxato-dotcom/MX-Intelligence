import { Link } from 'react-router-dom'
import { VideoList } from '@/components/videos/VideoList'
import { PageContainer } from '@/components/layout/PageContainer'
import { useVideos } from '@/hooks/useVideos'
import { ROUTES } from '@/lib/constants'
import styles from './VideosPage.module.css'

export function VideosPage() {
  const { videos, isLoading, error } = useVideos()

  return (
    <PageContainer
      title="Videos"
      description="Browse and manage intelligence videos from your catalog."
      actions={
        <Link to={ROUTES.VIDEOS_NEW} className={styles.newButton}>
          New video
        </Link>
      }
    >
      {isLoading && <div className={styles.stateBox}>Loading videos…</div>}

      {error && (
        <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">
          {error}
        </div>
      )}

      {!isLoading && !error && videos.length === 0 && (
        <div className={styles.stateBox}>
          No videos yet. <Link to={ROUTES.VIDEOS_NEW}>Add the first one</Link>.
        </div>
      )}

      {!isLoading && !error && videos.length > 0 && <VideoList videos={videos} />}
    </PageContainer>
  )
}
