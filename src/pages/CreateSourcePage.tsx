import { Link, useSearchParams } from 'react-router-dom'
import { SourceForm } from '@/components/sources/SourceForm'
import { PageContainer } from '@/components/layout/PageContainer'
import { getConnectorCatalogEntry } from '@/intelligence/connectors/connectorCatalog'
import { ROUTES } from '@/lib/constants'
import { SOURCE_TYPES } from '@/types/source'
import styles from './CreateSourcePage.module.css'

function resolveSourceType(param: string | null): string | undefined {
  if (!param) {
    return undefined
  }

  const catalogEntry = getConnectorCatalogEntry(param)
  if (catalogEntry?.implemented) {
    return catalogEntry.type
  }

  const matchedType = SOURCE_TYPES.find((type) => type.toLowerCase() === param.trim().toLowerCase())
  return matchedType
}

export function CreateSourcePage() {
  const [searchParams] = useSearchParams()
  const defaultSourceType = resolveSourceType(searchParams.get('source_type'))

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
      <SourceForm mode="create" defaultSourceType={defaultSourceType} />
    </PageContainer>
  )
}
