import { Link } from 'react-router-dom'
import { articleDetailPath, ROUTES, entityProfilePath } from '@/lib/constants'
import { formatDate } from '@/lib/format'
import type { EntityRelatedArticle } from '@/types/entityProfile'
import styles from './EntityProfileSections.module.css'

interface EntityProfileArticlesProps {
  articles: EntityRelatedArticle[]
}

export function EntityProfileArticles({ articles }: EntityProfileArticlesProps) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Related Articles</h3>
      {articles.length === 0 ? (
        <p className={styles.empty}>No related articles found.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Title</th>
                <th className={styles.th}>Source</th>
                <th className={styles.th}>Published</th>
                <th className={styles.th}>Trust</th>
                <th className={styles.th}>Cluster</th>
                <th className={styles.th}>Risk</th>
                <th className={styles.th}>Confidence</th>
                <th className={styles.th} />
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id}>
                  <td className={styles.cell}>{article.title}</td>
                  <td className={styles.cell}>{article.source}</td>
                  <td className={styles.cell}>{formatDate(article.publishedAt)}</td>
                  <td className={styles.cell}>{article.trust}</td>
                  <td className={styles.cell}>{article.clusterTitle ?? '—'}</td>
                  <td className={styles.cell}>{article.risk}</td>
                  <td className={styles.cell}>{article.confidence}%</td>
                  <td className={styles.cell}>
                    <Link to={articleDetailPath(article.id)} className={styles.link}>
                      Open Article
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

interface EntityProfileRelatedEntitiesProps {
  entities: Array<{
    entityId: string
    displayText: string
    entityType: string
    relationshipStrength: number
    coOccurrenceCount: number
    mentionsTogether: number
    averageConfidence: number
  }>
}

export function EntityProfileRelatedEntities({ entities }: EntityProfileRelatedEntitiesProps) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Related Entities</h3>
      {entities.length === 0 ? (
        <p className={styles.empty}>No co-occurring entities yet.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Entity</th>
                <th className={styles.th}>Type</th>
                <th className={styles.th}>Strength</th>
                <th className={styles.th}>Mentions Together</th>
                <th className={styles.th}>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {entities.map((entity) => (
                <tr key={entity.entityId}>
                  <td className={styles.cell}>
                    <Link to={entityProfilePath(entity.entityId)} className={styles.link}>
                      {entity.displayText}
                    </Link>
                  </td>
                  <td className={styles.cell}>{entity.entityType}</td>
                  <td className={styles.cell}>{entity.relationshipStrength}</td>
                  <td className={styles.cell}>{entity.mentionsTogether}</td>
                  <td className={styles.cell}>{entity.averageConfidence}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

interface EntityProfileClustersProps {
  clusters: Array<{
    id: string
    title: string
    confidenceScore: number
    reportCount: number
    sources: string[]
  }>
}

export function EntityProfileClusters({ clusters }: EntityProfileClustersProps) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Related Clusters</h3>
      {clusters.length === 0 ? (
        <p className={styles.empty}>No fusion clusters contain this entity.</p>
      ) : (
        <div className={styles.clusterList}>
          {clusters.map((cluster) => (
            <div key={cluster.id} className={styles.clusterCard}>
              <div>
                <p className={styles.clusterTitle}>{cluster.title}</p>
                <p className={styles.clusterMeta}>
                  Confidence {cluster.confidenceScore}% · {cluster.reportCount} reports ·{' '}
                  {cluster.sources.join(', ')}
                </p>
              </div>
              <Link
                to={`${ROUTES.TIMELINE}?cluster=${encodeURIComponent(cluster.id)}`}
                className={styles.link}
              >
                Open Cluster
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

interface EntityProfileSimilarProps {
  entities: Array<{
    entityId: string
    displayText: string
    entityType: string
    graphWeight: number
    connectionCount: number
  }>
}

export function EntityProfileSimilar({ entities }: EntityProfileSimilarProps) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Similar Entities</h3>
      {entities.length === 0 ? (
        <p className={styles.empty}>No similar entities found in the graph.</p>
      ) : (
        <ul className={styles.similarList}>
          {entities.map((entity) => (
            <li key={entity.entityId}>
              <Link
                to={entityProfilePath(entity.entityId)}
                className={styles.similarItem}
              >
                <span className={styles.similarName}>{entity.displayText}</span>
                <span className={styles.similarMeta}>
                  {entity.entityType} · weight {entity.graphWeight} · {entity.connectionCount} links
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
