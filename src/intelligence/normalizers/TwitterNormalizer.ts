import { PlaceholderNormalizer } from '@/intelligence/normalizers/placeholders'

export class TwitterNormalizer extends PlaceholderNormalizer {
  constructor() {
    super('Twitter')
  }
}

export const twitterNormalizer = new TwitterNormalizer()
