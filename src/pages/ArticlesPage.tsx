import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArticleClusterList } from '@/components/articles/ArticleClusterList'
import { ArticleList } from '@/components/articles/ArticleList'
import { PageContainer } from '@/components/layout/PageContainer'
import { useArticles } from '@/hooks/useArticles'
import { useFusionClusters } from '@/hooks/useFusionClusters'
import { ROUTES } from '@/lib/constants'
import styles from './ArticlesPage.module.css'

export function ArticlesPage() {
  const { articles, isLoading, error } = useArticles()
  const {
    clusters,
    isLoading: clustersLoading,
    error: clustersError,
  } = useFusionClusters()
  const [groupByCluster, setGroupByCluster] = useState(true)

  const isPageLoading = isLoading || clustersLoading
  const pageError = error ?? clustersError

  return (
    <PageContainer
      title="Articles"
      description="Browse and manage intelligence articles from your catalog."
      actions={
        <div className={styles.headerActions}>
          <button
            type="button"
            className={groupByCluster ? styles.toggleActive : styles.toggleButton}
            onClick={() => setGroupByCluster(true)}
          >
            Group by cluster
          </button>
          <button
            type="button"
            className={!groupByCluster ? styles.toggleActive : styles.toggleButton}
            onClick={() => setGroupByCluster(false)}
          >
            Flat list
          </button>
          <Link to={ROUTES.ARTICLES_NEW} className={styles.newButton}>
            New article
          </Link>
        </div>
      }
    >
      {isPageLoading && <div className={styles.stateBox}>Loading articles…</div>}

      {pageError && (
        <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">
          {pageError}
        </div>
      )}

      {!isPageLoading && !pageError && articles.length === 0 && (
        <div className={styles.stateBox}>
          No articles yet. <Link to={ROUTES.ARTICLES_NEW}>Create the first one</Link>.
        </div>
      )}

      {!isPageLoading && !pageError && articles.length > 0 && groupByCluster && (
        <ArticleClusterList articles={articles} clusters={clusters} />
      )}

      {!isPageLoading && !pageError && articles.length > 0 && !groupByCluster && (
        <ArticleList articles={articles} />
      )}
    </PageContainer>
  )
}
