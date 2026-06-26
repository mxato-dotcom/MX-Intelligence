export interface RedditPost {
  title: string
  selftext: string
  author: string
  score: number
  num_comments: number
  url: string
  permalink: string
  created_utc: number
  thumbnail?: string
  subreddit?: string
}
