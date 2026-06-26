import { SourceCard } from '@/components/sources/SourceCard'
import type { Source } from '@/types/source'
import styles from './SourceList.module.css'

interface SourceListProps {
  sources: Source[]
  onSourceUpdated?: () => void
}

export function SourceList({ sources, onSourceUpdated }: SourceListProps) {
  return (
    <div className={styles.list}>
      {sources.map((source) => (
        <SourceCard key={source.id} source={source} onSourceUpdated={onSourceUpdated} />
      ))}
    </div>
  )
}
