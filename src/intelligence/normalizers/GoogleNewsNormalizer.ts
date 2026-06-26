import { PlaceholderNormalizer } from '@/intelligence/normalizers/placeholders'

export class GoogleNewsNormalizer extends PlaceholderNormalizer {
  constructor() {
    super('Google News')
  }
}

export const googleNewsNormalizer = new GoogleNewsNormalizer()
