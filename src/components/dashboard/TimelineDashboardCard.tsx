import { Link } from 'react-router-dom'
import { TimelineEventCard } from '@/components/timeline/TimelineEventCard'
import type { TimelineEvent } from '@/types/timeline'
import { ROUTES } from '@/lib/constants'
import styles from './TimelineDashboardCard.module.css'

interface TimelineDashboardCardProps {
  events: TimelineEvent[]
}

export function TimelineDashboardCard({ events }: TimelineDashboardCardProps) {
  if (events.length === 0) {
    return (
      <section className={styles.card}>
        <div className={styles.header}>
          <h3 className={styles.title}>Recent Intelligence Timeline</h3>
          <Link to={ROUTES.TIMELINE} className={styles.link}>View timeline</Link>
        </div>
        <p className={styles.empty}>No timeline events yet. Import articles or generate briefs to build the investigation view.</p>
      </section>
    )
  }

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>Recent Intelligence Timeline</h3>
        <Link to={ROUTES.TIMELINE} className={styles.link}>View timeline</Link>
      </div>
      <div className={styles.list}>
        {events.map((event) => (
          <TimelineEventCard key={event.id} event={event} compact />
        ))}
      </div>
    </section>
  )
}
