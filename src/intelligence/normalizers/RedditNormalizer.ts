import { safeTrim } from '@/lib/safeString'
import { buildIntelligenceItem } from '@/intelligence/normalizers/buildIntelligenceItem'
import type { Normalizer, NormalizerContext } from '@/intelligence/normalizers/Normalizer'
import type { IntelligenceItem } from '@/intelligence/types/IntelligenceItem'
import type { RedditPost } from '@/types/reddit'

function redditUrl(post: RedditPost): string {
  if (post.url.startsWith('http')) {
    return post.url
  }

  return `https://www.reddit.com${post.permalink}`
}

function redditThumbnail(post: RedditPost): string | undefined {
  const thumb = safeTrim(post.thumbnail)
  if (!thumb || thumb === 'self' || thumb === 'default' || thumb === 'nsfw') {
    return undefined
  }

  return thumb
}

export class RedditNormalizer implements Normalizer<RedditPost> {
  readonly type = 'Reddit'

  async normalize(post: RedditPost, context: NormalizerContext): Promise<IntelligenceItem> {
    const url = redditUrl(post)
    const summary = safeTrim(post.selftext)
    const content = summary || `Score: ${post.score} · Comments: ${post.num_comments}`
    const publishedAt = post.created_utc
      ? new Date(post.created_utc * 1000).toISOString()
      : new Date().toISOString()
    const tags = post.subreddit ? [`r/${post.subreddit}`] : []

    return buildIntelligenceItem(context, {
      title: post.title,
      url,
      summary,
      content,
      imageUrl: redditThumbnail(post),
      author: post.author,
      publishedAt,
      tags,
      rawData: post,
    })
  }

  async normalizeMany(posts: RedditPost[], context: NormalizerContext): Promise<IntelligenceItem[]> {
    return Promise.all(posts.map((post) => this.normalize(post, context)))
  }
}

export const redditNormalizer = new RedditNormalizer()
