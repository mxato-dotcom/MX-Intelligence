import type { CredentialStatus } from '@/types/connectorSettings'
import styles from './CredentialStatusBadge.module.css'

const LABELS: Record<CredentialStatus, string> = {
  configured: 'Configured',
  partial: 'Partial',
  missing: 'Not configured',
}

interface CredentialStatusBadgeProps {
  status: CredentialStatus
}

export function CredentialStatusBadge({ status }: CredentialStatusBadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[status]}`}>
      {LABELS[status]}
    </span>
  )
}
