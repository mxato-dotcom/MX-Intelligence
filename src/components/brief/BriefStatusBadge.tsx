import type { BriefStatus } from '@/intelligence/brief/BriefTypes'
import { briefStatusClass, briefStatusLabel } from '@/intelligence/brief/briefStatus'
import styles from './BriefStatusBadge.module.css'

interface BriefStatusBadgeProps {
  status: BriefStatus
}

export function BriefStatusBadge({ status }: BriefStatusBadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[briefStatusClass(status)]}`}>
      {briefStatusLabel(status)}
    </span>
  )
}
