import type { ArticleEntityRecord, GroupedArticleEntities } from '@/intelligence/entities/Entity'
import type { EntityType } from '@/intelligence/entities/EntityType'
import styles from './ArticleEntityList.module.css'

interface ArticleEntityListProps {
  groups: GroupedArticleEntities[]
  isLoading?: boolean
  error?: string | null
}

interface EntitySection {
  label: string
  types: EntityType[]
}

const ARTICLE_ENTITY_SECTIONS: EntitySection[] = [
  { label: 'People', types: ['Person'] },
  { label: 'Organizations', types: ['Organization'] },
  { label: 'Companies', types: ['Company'] },
  { label: 'Countries', types: ['Country'] },
  { label: 'Technologies', types: ['Technology'] },
  { label: 'Products', types: ['Product'] },
  { label: 'Crypto', types: ['Cryptocurrency'] },
  { label: 'Software', types: ['Software'] },
  { label: 'Keywords', types: ['Keyword'] },
]

function buildSectionGroups(groups: GroupedArticleEntities[]): Array<{
  label: string
  entities: ArticleEntityRecord[]
}> {
  const byType = new Map<EntityType, ArticleEntityRecord[]>()

  for (const group of groups) {
    byType.set(group.type, group.entities)
  }

  const sections: Array<{ label: string; entities: ArticleEntityRecord[] }> = []

  for (const section of ARTICLE_ENTITY_SECTIONS) {
    const entities = section.types.flatMap((type) => byType.get(type) ?? [])
    if (entities.length > 0) {
      sections.push({ label: section.label, entities })
    }
  }

  const coveredTypes = new Set<EntityType>(ARTICLE_ENTITY_SECTIONS.flatMap((section) => section.types))
  const otherEntities = groups
    .filter((group) => !coveredTypes.has(group.type))
    .flatMap((group) => group.entities)

  if (otherEntities.length > 0) {
    sections.push({ label: 'Other', entities: otherEntities })
  }

  return sections
}

export function ArticleEntityList({ groups, isLoading, error }: ArticleEntityListProps) {
  if (isLoading) {
    return <div className={styles.stateBox}>Loading extracted entities…</div>
  }

  if (error) {
    return (
      <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">
        {error}
      </div>
    )
  }

  if (groups.length === 0) {
    return <div className={styles.stateBox}>No entities extracted for this article yet.</div>
  }

  const sections = buildSectionGroups(groups)

  return (
    <section className={styles.section}>
      <h3 className={styles.title}>Extracted entities</h3>
      <div className={styles.groups}>
        {sections.map((section) => (
          <div key={section.label} className={styles.group}>
            <h4 className={styles.groupTitle}>{section.label}</h4>
            <div className={styles.entityList}>
              {section.entities.map((entity) => (
                <span key={entity.id} className={styles.entityChip}>
                  <span className={styles.entityText}>{entity.entity_text}</span>
                  <span className={styles.entityConfidence}>{entity.confidence}%</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
