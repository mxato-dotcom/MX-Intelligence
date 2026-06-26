import { Link, useParams } from 'react-router-dom'
import { PageContainer } from '@/components/layout/PageContainer'
import { useArticle } from '@/hooks/useArticle'
import { formatDate } from '@/lib/format'
import { safeStringOr } from '@/lib/safeString'
import { ROUTES } from '@/lib/constants'
import styles from './ArticleDetailPage.module.css'

export function ArticleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { article, isLoading, error } = useArticle(id)

  if (isLoading) {
    return (
      <PageContainer title="Article">
        <div className={styles.stateBox}>Loading article…</div>
      </PageContainer>
    )
  }

  if (error || !article) {
    return (
      <PageContainer
        title="Article"
        actions={
          <Link to={ROUTES.ARTICLES} className={styles.backLink}>
            Back to articles
          </Link>
        }
      >
        <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">
          {error ?? 'Article not found'}
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer
      title={safeStringOr(article.title, 'Untitled')}
      actions={
        <Link to={ROUTES.ARTICLES} className={styles.backLink}>
          Back to articles
        </Link>
      }
    >
      <article className={styles.article}>
        <div className={styles.meta}>
          <span className={styles.badge}>{safeStringOr(article.source, 'Unknown source')}</span>
          <span className={styles.badge}>{safeStringOr(article.category, 'Uncategorized')}</span>
          <time className={styles.date} dateTime={article.published_at}>
            {formatDate(article.published_at)}
          </time>
        </div>

        {article.summary && <p className={styles.summary}>{article.summary}</p>}

        <div className={styles.content}>
          {article.content || article.summary || 'No content available.'}
        </div>

        {article.url && (
          <p className={styles.externalLink}>
            <a href={article.url} target="_blank" rel="noopener noreferrer">
              View original source
            </a>
          </p>
        )}
      </article>
    </PageContainer>
  )
}
