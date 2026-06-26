import { GraphExplorer } from '@/components/graph/GraphExplorer'
import type { GraphData } from '@/types/graph'
import styles from './EntityProfileSections.module.css'

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
        <GraphExplorer
          graph={graphData}
          centerNodeId={centerNodeId}
          initialNodeId={centerNodeId}
          compact
          maxNodes={60}
          maxEdges={120}
          showListPanels={false}
        />
      )}
    </section>
  )
}
