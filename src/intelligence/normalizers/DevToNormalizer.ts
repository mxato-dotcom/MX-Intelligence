import { PlaceholderNormalizer } from '@/intelligence/normalizers/placeholders'

export class DevToNormalizer extends PlaceholderNormalizer {
  constructor() {
    super('Dev.to')
  }
}

export const devToNormalizer = new DevToNormalizer()
