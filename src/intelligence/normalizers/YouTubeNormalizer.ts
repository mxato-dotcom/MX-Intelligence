import { PlaceholderNormalizer } from '@/intelligence/normalizers/placeholders'

export class YouTubeNormalizer extends PlaceholderNormalizer {
  constructor() {
    super('YouTube')
  }
}

export const youtubeNormalizer = new YouTubeNormalizer()
