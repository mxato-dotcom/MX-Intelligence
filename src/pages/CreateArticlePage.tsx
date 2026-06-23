import { Link } from 'react-router-dom'
import { ArticleForm } from '@/components/articles/ArticleForm'
import { PageContainer } from '@/components/layout/PageContainer'
import { ROUTES } from '@/lib/constants'
import styles from './CreateArticlePage.module.css'

export function CreateArticlePage() {
  return (
    <PageContainer
      title="New article"
      description="Add a new article to your intelligence catalog."
      actions={
        <Link to={ROUTES.ARTICLES} className={styles.backLink}>
          Back to articles
        </Link>
      }
    >
      <ArticleForm />
    </PageContainer>
  )
}
