import { Link, useParams } from 'react-router-dom'
import { PageContainer } from '@/components/layout/PageContainer'
import { useVideo } from '@/hooks/useVideo'
import { formatDate } from '@/lib/format'
import { ROUTES } from '@/lib/constants'
import { getYouTubeEmbedUrl, getYouTubeVideoId } from '@/lib/youtube'
import styles from './VideoDetailPage.module.css'

export function VideoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { video, isLoading, error } = useVideo(id)

  if (isLoading) {
    return (
      <PageContainer title="Video">
        <div className={styles.stateBox}>Loading video…</div>
      </PageContainer>
    )
  }

  if (error || !video) {
    return (
      <PageContainer
        title="Video"
        actions={
          <Link to={ROUTES.VIDEOS} className={styles.backLink}>
            Back to videos
          </Link>
        }
      >
        <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">
          {error ?? 'Video not found'}
        </div>
      </PageContainer>
    )
  }

  const youtubeId = getYouTubeVideoId(video.url)

  return (
    <PageContainer
      title={video.title}
      actions={
        <Link to={ROUTES.VIDEOS} className={styles.backLink}>
          Back to videos
        </Link>
      }
    >
      <article className={styles.video}>
        <div className={styles.meta}>
          <span className={styles.badge}>{video.source}</span>
          <span className={styles.badge}>{video.category}</span>
          <time className={styles.date} dateTime={video.created_at}>
            {formatDate(video.created_at)}
          </time>
        </div>

        {youtubeId && (
          <div className={styles.playerWrap}>
            <iframe
              className={styles.player}
              src={getYouTubeEmbedUrl(youtubeId)}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        )}

        {video.description && <p className={styles.description}>{video.description}</p>}

        {video.url && (
          <p className={styles.externalLink}>
            <a href={video.url} target="_blank" rel="noopener noreferrer">
              {youtubeId ? 'Open on YouTube' : 'View original source'}
            </a>
          </p>
        )}
      </article>
    </PageContainer>
  )
}
