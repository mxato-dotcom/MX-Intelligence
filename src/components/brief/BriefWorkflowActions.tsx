import { Link } from 'react-router-dom'
import type { BriefStatus, IntelligenceDailyBrief } from '@/intelligence/brief/BriefTypes'
import { briefDetailPath } from '@/lib/constants'
import styles from './BriefWorkflowActions.module.css'

interface BriefWorkflowActionsProps {
  brief: IntelligenceDailyBrief
  onMarkReviewed: (id: string) => void
  onPublish: (id: string) => void
  onArchive: (id: string) => void
  isProcessing?: boolean
  compact?: boolean
}

function canMarkReviewed(status: BriefStatus): boolean {
  return status === 'draft'
}

function canPublish(status: BriefStatus): boolean {
  return status === 'draft' || status === 'reviewed'
}

function canArchive(status: BriefStatus): boolean {
  return status !== 'archived'
}

export function BriefWorkflowActions({
  brief,
  onMarkReviewed,
  onPublish,
  onArchive,
  isProcessing = false,
  compact = false,
}: BriefWorkflowActionsProps) {
  return (
    <div className={compact ? styles.actionsCompact : styles.actions}>
      <Link to={briefDetailPath(brief.id)} className={styles.actionButton}>
        Open
      </Link>
      <button
        type="button"
        className={styles.actionButton}
        disabled={isProcessing || !canMarkReviewed(brief.status)}
        onClick={() => onMarkReviewed(brief.id)}
      >
        Mark reviewed
      </button>
      <button
        type="button"
        className={styles.actionButtonPrimary}
        disabled={isProcessing || !canPublish(brief.status)}
        onClick={() => onPublish(brief.id)}
      >
        Publish
      </button>
      <button
        type="button"
        className={styles.actionButtonMuted}
        disabled={isProcessing || !canArchive(brief.status)}
        onClick={() => onArchive(brief.id)}
      >
        Archive
      </button>
    </div>
  )
}
