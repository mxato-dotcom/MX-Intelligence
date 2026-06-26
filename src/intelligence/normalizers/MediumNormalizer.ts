import { PlaceholderNormalizer } from '@/intelligence/normalizers/placeholders'

export class MediumNormalizer extends PlaceholderNormalizer {
  constructor() {
    super('Medium')
  }
}

export const mediumNormalizer = new MediumNormalizer()
