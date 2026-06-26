import { PlaceholderNormalizer } from '@/intelligence/normalizers/placeholders'

export class HackerNewsNormalizer extends PlaceholderNormalizer {
  constructor() {
    super('Hacker News')
  }
}

export const hackerNewsNormalizer = new HackerNewsNormalizer()
