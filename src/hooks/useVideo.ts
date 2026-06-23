import { useEffect, useState } from 'react'
import * as videoService from '@/services/videoService'
import type { Video } from '@/types/video'

export function useVideo(id: string | undefined) {
  const [video, setVideo] = useState<Video | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setVideo(null)
      setIsLoading(false)
      return
    }

    let isMounted = true

    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const data = await videoService.getVideo(id)
        if (isMounted) {
          setVideo(data)
          if (!data) {
            setError('Video not found')
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load video')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [id])

  return { video, isLoading, error }
}
