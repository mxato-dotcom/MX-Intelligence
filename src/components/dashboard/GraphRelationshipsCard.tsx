import { Link } from 'react-router-dom'
import type { TopRelationship } from '@/types/graph'
import { ROUTES } from '@/lib/constants'
import styles from './GraphRelationshipsCard.module.css'

interface GraphRelationshipsCardProps {
  relationships: TopRelationship[]
}

export function GraphRelationshipsCard({ relationships }: GraphRelationshipsCardProps) {
  if (relationships.length === 0) {
    return (
      <section className={styles.card}>
        <div className={styles.header}>
          <h3 className={styles.title}>Top Relationships</h3>
          <Link to={ROUTES.GRAPH} className={styles.link}>View graph</Link>
        </div>
        <p className={styles.empty}>
          No entity relationships yet. Extract entities from articles to build the relationship graph.
        </p>
      </section>
    )
  }

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>Top Relationships</h3>
        <Link to={ROUTES.GRAPH} className={styles.link}>View graph</Link>
      </div>
      <ul className={styles.list}>
        {relationships.map((relationship) => (
          <li key={`${relationship.entityA}-${relationship.entityB}`} className={styles.item}>
            <p className={styles.pair}>
              {relationship.entityA} ↔ {relationship.entityB}
            </p>
            <p className={styles.meta}>
              Confidence {relationship.confidence}% · Evidence {relationship.evidenceCount}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
