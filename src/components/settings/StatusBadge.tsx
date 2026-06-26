import styles from './StatusBadge.module.css'

export type StatusBadgeVariant = 'green' | 'amber' | 'red' | 'blue' | 'neutral'

interface StatusBadgeProps {
  label: string
  variant?: StatusBadgeVariant
  showDot?: boolean
}

export function StatusBadge({ label, variant = 'neutral', showDot = true }: StatusBadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {showDot && <span className={styles.dot} aria-hidden="true" />}
      {label}
    </span>
  )
}
