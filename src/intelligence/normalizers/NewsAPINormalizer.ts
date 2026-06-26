import { PlaceholderNormalizer } from '@/intelligence/normalizers/placeholders'

export class NewsAPINormalizer extends PlaceholderNormalizer {
  constructor() {
    super('NewsAPI')
  }
}

export const newsApiNormalizer = new NewsAPINormalizer()
