import { Link, useParams } from 'react-router-dom'
import { SourceForm } from '@/components/sources/SourceForm'
import { PageContainer } from '@/components/layout/PageContainer'
import { useSource } from '@/hooks/useSource'
import { ROUTES, sourceDetailPath } from '@/lib/constants'
import styles from './SourceDetailPage.module.css'

export function EditSourcePage() {
  const { id } = useParams<{ id: string }>()
  const { source, isLoading, error } = useSource(id)

  if (isLoading) {
    return (
      <PageContainer title="Edit source">
        <div className={styles.stateBox}>Loading source…</div>
      </PageContainer>
    )
  }

  if (error || !source) {
    return (
      <PageContainer
        title="Edit source"
        actions={
          <Link to={ROUTES.SOURCES} className={styles.backLink}>
            Back to sources
          </Link>
        }
      >
        <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">
          {error ?? 'Source not found'}
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer
      title="Edit source"
      description={`Update settings for ${source.name}`}
      actions={
        <Link to={sourceDetailPath(source.id)} className={styles.backLink}>
          Back to source
        </Link>
      }
    >
      <SourceForm mode="edit" source={source} />
    </PageContainer>
  )
}
