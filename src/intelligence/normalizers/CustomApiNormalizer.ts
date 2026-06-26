import { PlaceholderNormalizer } from '@/intelligence/normalizers/placeholders'

export class CustomApiNormalizer extends PlaceholderNormalizer {
  constructor() {
    super('Custom API')
  }
}

export const customApiNormalizer = new CustomApiNormalizer()
