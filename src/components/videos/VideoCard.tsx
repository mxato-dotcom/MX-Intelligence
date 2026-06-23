import { Link } from 'react-router-dom'
import { formatDate } from '@/lib/format'
import { videoDetailPath } from '@/lib/constants'
import type { Video } from '@/types/video'
import styles from './VideoCard.module.css'

interface VideoCardProps {
  video: Video
}

export function VideoCard({ video }: VideoCardProps) {
  return (
    <Link to={videoDetailPath(video.id)} className={styles.card}>
      <div className={styles.thumbnailWrap}>
        {video.thumbnail_url ? (
          <img
            className={styles.thumbnail}
            src={video.thumbnail_url}
            alt=""
            loading="lazy"
          />
        ) : (
          <div className={styles.thumbnailPlaceholder}>No thumbnail</div>
        )}
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>{video.title}</h3>
        <div className={styles.meta}>
          <span className={styles.badge}>{video.source}</span>
          <span className={styles.badge}>{video.category}</span>
          <time className={styles.date} dateTime={video.created_at}>
            {formatDate(video.created_at)}
          </time>
        </div>
        {video.description && <p className={styles.description}>{video.description}</p>}
      </div>
    </Link>
  )
}
