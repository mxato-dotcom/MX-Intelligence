import { Link } from 'react-router-dom'
import { VideoForm } from '@/components/videos/VideoForm'
import { PageContainer } from '@/components/layout/PageContainer'
import { ROUTES } from '@/lib/constants'
import styles from './CreateVideoPage.module.css'

export function CreateVideoPage() {
  return (
    <PageContainer
      title="New video"
      description="Add a new video to your intelligence catalog."
      actions={
        <Link to={ROUTES.VIDEOS} className={styles.backLink}>
          Back to videos
        </Link>
      }
    >
      <VideoForm />
    </PageContainer>
  )
}
