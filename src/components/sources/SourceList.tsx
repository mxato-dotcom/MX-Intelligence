import { SourceCard } from '@/components/sources/SourceCard'
import type { Source } from '@/types/source'
import { buildPlaceholderSyncState, type SourceSyncState } from '@/types/sourceSync'
import styles from './SourceList.module.css'

interface SourceListProps {
  sources: Source[]
  syncStates: Record<string, SourceSyncState>
}

export function SourceList({ sources, syncStates }: SourceListProps) {
  return (
    <div className={styles.list}>
      {sources.map((source) => (
        <SourceCard
          key={source.id}
          source={source}
          syncState={syncStates[source.id] ?? buildPlaceholderSyncState(source)}
        />
      ))}
    </div>
  )
}
