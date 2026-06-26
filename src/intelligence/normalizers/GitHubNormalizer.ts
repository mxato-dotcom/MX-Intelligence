import { PlaceholderNormalizer } from '@/intelligence/normalizers/placeholders'

export class GitHubNormalizer extends PlaceholderNormalizer {
  constructor() {
    super('GitHub')
  }
}

export const githubNormalizer = new GitHubNormalizer()
