export function getYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      const id = parsed.pathname.slice(1).split('/')[0]
      return id || null
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v')
      }

      const embedMatch = parsed.pathname.match(/^\/embed\/([^/?]+)/)
      if (embedMatch) {
        return embedMatch[1]
      }

      const shortsMatch = parsed.pathname.match(/^\/shorts\/([^/?]+)/)
      if (shortsMatch) {
        return shortsMatch[1]
      }
    }
  } catch {
    return null
  }

  return null
}

export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`
}

export function isYouTubeUrl(url: string): boolean {
  return getYouTubeVideoId(url) !== null
}
