import { SourceCard } from '@/components/sources/SourceCard'
import type { Source } from '@/types/source'
import styles from './SourceList.module.css'

interface SourceListProps {
  sources: Source[]
}

export function SourceList({ sources }: SourceListProps) {
  return (
    <div className={styles.list}>
      {sources.map((source) => (
        <SourceCard key={source.id} source={source} />
      ))}
    </div>
  )
}
