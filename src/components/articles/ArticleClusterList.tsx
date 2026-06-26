import { useState } from 'react'
import { ArticleCard } from '@/components/articles/ArticleCard'
import { FusionClusterCard } from '@/components/fusion/FusionClusterCard'
import type { IntelligenceCluster } from '@/intelligence/fusion/FusionCluster'
import type { Article } from '@/types/article'
import styles from './ArticleClusterList.module.css'

interface ArticleClusterListProps {
  articles: Article[]
  clusters: IntelligenceCluster[]
}

export function ArticleClusterList({ articles, clusters }: ArticleClusterListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())

  const articleMap = new Map(articles.map((article) => [article.id, article]))
  const clusteredArticleIds = new Set(
    clusters.flatMap((cluster) => cluster.articleIds),
  )

  const unclusteredArticles = articles.filter((article) => !clusteredArticleIds.has(article.id))

  const toggleExpanded = (clusterId: string) => {
    setExpandedIds((previous) => {
      const next = new Set(previous)
      if (next.has(clusterId)) {
        next.delete(clusterId)
      } else {
        next.add(clusterId)
      }
      return next
    })
  }

  return (
    <div className={styles.list}>
      {clusters.map((cluster) => {
        const isExpanded = expandedIds.has(cluster.id)
        const clusterArticles = cluster.articleIds
          .map((id) => articleMap.get(id))
          .filter((article): article is Article => article !== undefined)

        return (
          <section key={cluster.id} className={styles.clusterSection}>
            <button
              type="button"
              className={styles.clusterHeader}
              onClick={() => toggleExpanded(cluster.id)}
              aria-expanded={isExpanded}
            >
              <span className={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
              <div className={styles.clusterHeaderBody}>
                <FusionClusterCard cluster={cluster} />
              </div>
            </button>

            {isExpanded && (
              <div className={styles.clusterArticles}>
                {clusterArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </section>
        )
      })}

      {unclusteredArticles.length > 0 && (
        <section className={styles.unclusteredSection}>
          <h3 className={styles.unclusteredTitle}>Unclustered reports</h3>
          <div className={styles.unclusteredList}>
            {unclusteredArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
