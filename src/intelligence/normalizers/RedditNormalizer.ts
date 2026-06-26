import { PlaceholderNormalizer } from '@/intelligence/normalizers/placeholders'

export class RedditNormalizer extends PlaceholderNormalizer {
  constructor() {
    super('Reddit')
  }
}

export const redditNormalizer = new RedditNormalizer()
