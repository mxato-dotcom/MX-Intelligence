import { Link } from 'react-router-dom'
import { SourceForm } from '@/components/sources/SourceForm'
import { PageContainer } from '@/components/layout/PageContainer'
import { ROUTES } from '@/lib/constants'
import styles from './CreateSourcePage.module.css'

export function CreateSourcePage() {
  return (
    <PageContainer
      title="New source"
      description="Add a new intelligence source to monitor."
      actions={
        <Link to={ROUTES.SOURCES} className={styles.backLink}>
          Back to sources
        </Link>
      }
    >
      <SourceForm mode="create" />
    </PageContainer>
  )
}
