import type { GroupedArticleEntities } from '@/intelligence/entities/Entity'
import styles from './ArticleEntityList.module.css'

interface ArticleEntityListProps {
  groups: GroupedArticleEntities[]
  isLoading?: boolean
  error?: string | null
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

  return (
    <section className={styles.section}>
      <h3 className={styles.title}>Extracted entities</h3>
      <div className={styles.groups}>
        {groups.map((group) => (
          <div key={group.type} className={styles.group}>
            <h4 className={styles.groupTitle}>{group.type}</h4>
            <div className={styles.entityList}>
              {group.entities.map((entity) => (
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
