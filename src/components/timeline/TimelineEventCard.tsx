import { Link } from 'react-router-dom'
import type { TimelineEvent } from '@/types/timeline'
import { articleDetailPath, briefDetailPath, ROUTES } from '@/lib/constants'
import { formatDate } from '@/lib/format'
import styles from './TimelineEventCard.module.css'

function eventIcon(type: TimelineEvent['type']): string {
  switch (type) {
    case 'article':
      return 'A'
    case 'entity':
      return 'E'
    case 'alert':
      return '!'
    case 'cluster':
      return 'C'
    case 'brief':
      return 'B'
    default:
      return '•'
  }
}

function riskClass(risk: string): string {
  const normalized = risk.toLowerCase()
  if (normalized === 'critical') return styles.critical
  if (normalized === 'high') return styles.high
  if (normalized === 'elevated' || normalized === 'medium') return styles.elevated
  if (normalized === 'moderate') return styles.moderate
  if (normalized === 'low') return styles.low
  return styles.info
}

interface TimelineEventCardProps {
  event: TimelineEvent
  compact?: boolean
}

export function TimelineEventCard({ event, compact = false }: TimelineEventCardProps) {
  const primaryArticleId = event.relatedArticles[0]
  const clusterLink = event.relatedCluster
    ? `${ROUTES.TIMELINE}?cluster=${encodeURIComponent(event.relatedCluster)}`
    : null

  return (
    <article className={compact ? styles.cardCompact : styles.card}>
      <div className={styles.iconWrap}>{eventIcon(event.type)}</div>
      <div className={styles.body}>
        <div className={styles.header}>
          <h3 className={styles.title}>{event.title}</h3>
          <time className={styles.time} dateTime={event.timestamp}>
            {formatDate(event.timestamp)}
          </time>
        </div>

        {!compact && <p className={styles.description}>{event.description}</p>}

        <div className={styles.badges}>
          <span className={styles.typeBadge}>{event.type}</span>
          <span className={`${styles.riskBadge} ${riskClass(event.risk)}`}>{event.risk}</span>
          <span className={styles.confidenceBadge}>{event.confidence}% confidence</span>
        </div>

        <div className={styles.meta}>
          <span>Source: {event.source}</span>
          {event.relatedEntities.length > 0 && (
            <span>Entities: {event.relatedEntities.slice(0, 4).join(', ')}</span>
          )}
        </div>

        <div className={styles.actions}>
          {primaryArticleId && (
            <Link to={articleDetailPath(primaryArticleId)} className={styles.actionLink}>
              Open Article
            </Link>
          )}
          {clusterLink && (
            <Link to={clusterLink} className={styles.actionLink}>
              Open Cluster
            </Link>
          )}
          {event.relatedBriefId && (
            <Link to={briefDetailPath(event.relatedBriefId)} className={styles.actionLink}>
              Open Brief
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
