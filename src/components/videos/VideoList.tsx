import { VideoCard } from '@/components/videos/VideoCard'
import type { Video } from '@/types/video'
import styles from './VideoList.module.css'

interface VideoListProps {
  videos: Video[]
}

export function VideoList({ videos }: VideoListProps) {
  return (
    <div className={styles.list}>
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  )
}
