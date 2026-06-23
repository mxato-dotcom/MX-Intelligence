import { ArticleCard } from '@/components/articles/ArticleCard'
import type { Article } from '@/types/article'
import styles from './ArticleList.module.css'

interface ArticleListProps {
  articles: Article[]
}

export function ArticleList({ articles }: ArticleListProps) {
  return (
    <div className={styles.list}>
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  )
}
