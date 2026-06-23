import { Link } from 'react-router-dom'
import { ArticleList } from '@/components/articles/ArticleList'
import { PageContainer } from '@/components/layout/PageContainer'
import { useArticles } from '@/hooks/useArticles'
import { ROUTES } from '@/lib/constants'
import styles from './ArticlesPage.module.css'

export function ArticlesPage() {
  const { articles, isLoading, error } = useArticles()

  return (
    <PageContainer
      title="Articles"
      description="Browse and manage intelligence articles from your catalog."
      actions={
        <Link to={ROUTES.ARTICLES_NEW} className={styles.newButton}>
          New article
        </Link>
      }
    >
      {isLoading && <div className={styles.stateBox}>Loading articles…</div>}

      {error && (
        <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">
          {error}
        </div>
      )}

      {!isLoading && !error && articles.length === 0 && (
        <div className={styles.stateBox}>
          No articles yet. <Link to={ROUTES.ARTICLES_NEW}>Create the first one</Link>.
        </div>
      )}

      {!isLoading && !error && articles.length > 0 && <ArticleList articles={articles} />}
    </PageContainer>
  )
}
