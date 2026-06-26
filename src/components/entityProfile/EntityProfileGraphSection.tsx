import { lazy, Suspense } from 'react'
import { GraphExplorer } from '@/components/graph/GraphExplorer'
import type { GraphData } from '@/types/graph'
import styles from './EntityProfileSections.module.css'

const LazyGraphExplorer = lazy(async () => ({
  default: GraphExplorer,
}))

interface EntityProfileGraphSectionProps {
  graphData: GraphData
  centerNodeId: string
}

export function EntityProfileGraphSection({
  graphData,
  centerNodeId,
}: EntityProfileGraphSectionProps) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Relationship Graph</h3>
      {graphData.nodes.length === 0 ? (
        <p className={styles.empty}>No graph relationships available for this entity.</p>
      ) : (
        <Suspense fallback={<p className={styles.empty}>Loading relationship graph…</p>}>
          <LazyGraphExplorer graph={graphData} initialNodeId={centerNodeId} compact />
        </Suspense>
      )}
    </section>
  )
}
