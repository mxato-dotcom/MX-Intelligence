import type { AlertSeverity } from '@/types/alert'
import styles from './AlertSeverityBadge.module.css'

function severityClass(severity: AlertSeverity): string {
  switch (severity) {
    case 'critical':
      return styles.critical
    case 'high':
      return styles.high
    case 'medium':
      return styles.medium
    case 'low':
      return styles.low
    default:
      return styles.info
  }
}

function severityLabel(severity: AlertSeverity): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1)
}

interface AlertSeverityBadgeProps {
  severity: AlertSeverity
}

export function AlertSeverityBadge({ severity }: AlertSeverityBadgeProps) {
  return (
    <span className={`${styles.badge} ${severityClass(severity)}`}>
      {severityLabel(severity)}
    </span>
  )
}
