import { TimelineEventCard } from '@/components/timeline/TimelineEventCard'
import type { TimelineEvent } from '@/types/timeline'
import styles from './EntityProfileSections.module.css'

interface EntityProfileTimelineProps {
  events: TimelineEvent[]
}

export function EntityProfileTimeline({ events }: EntityProfileTimelineProps) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Intelligence Timeline</h3>
      {events.length === 0 ? (
        <p className={styles.empty}>No timeline events involve this entity yet.</p>
      ) : (
        <div className={styles.timelineList}>
          {events.map((event) => (
            <TimelineEventCard key={event.id} event={event} compact />
          ))}
        </div>
      )}
    </section>
  )
}
