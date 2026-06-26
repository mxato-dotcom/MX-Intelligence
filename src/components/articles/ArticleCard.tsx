import { Link } from 'react-router-dom'
import { formatDate } from '@/lib/format'
import { articleDetailPath } from '@/lib/constants'
import { safeStringOr } from '@/lib/safeString'
import type { Article } from '@/types/article'
import styles from './ArticleCard.module.css'

interface ArticleCardProps {
  article: Article
}

export function ArticleCard({ article }: ArticleCardProps) {
  return (
    <Link to={articleDetailPath(article.id)} className={styles.card}>
      <h3 className={styles.title}>{safeStringOr(article.title, 'Untitled')}</h3>
      <div className={styles.meta}>
        <span className={styles.badge}>{safeStringOr(article.source, 'Unknown source')}</span>
        <span className={styles.badge}>{safeStringOr(article.category, 'Uncategorized')}</span>
        <time className={styles.date} dateTime={article.published_at}>
          {formatDate(article.published_at)}
        </time>
      </div>
      {article.summary && <p className={styles.summary}>{article.summary}</p>}
    </Link>
  )
}
