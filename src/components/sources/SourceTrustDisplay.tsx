import { useSourceTrust, formatTrendLabel } from '@/hooks/useSourceTrust'
import type { Source } from '@/types/source'
import styles from './SourceTrustDisplay.module.css'

interface SourceTrustDisplayProps {
  source: Source
  compact?: boolean
}

function healthClass(health: string): string {
  switch (health) {
    case 'Excellent':
      return `${styles.healthBadge} ${styles.healthExcellent}`
    case 'Healthy':
      return `${styles.healthBadge} ${styles.healthHealthy}`
    case 'Warning':
      return `${styles.healthBadge} ${styles.healthWarning}`
    case 'Poor':
      return `${styles.healthBadge} ${styles.healthPoor}`
    case 'Offline':
      return `${styles.healthBadge} ${styles.healthOffline}`
    default:
      return styles.healthBadge
  }
}

function trendClass(trend: string): string {
  switch (trend) {
    case 'up':
      return `${styles.trend} ${styles.trendUp}`
    case 'down':
      return `${styles.trend} ${styles.trendDown}`
    default:
      return `${styles.trend} ${styles.trendFlat}`
  }
}

export function SourceTrustDisplay({ source, compact = false }: SourceTrustDisplayProps) {
  const profile = useSourceTrust(source)

  if (compact) {
    return (
      <span className={styles.compactWrap}>
        <span className={styles.score}>{profile.score}</span>
        <span className={healthClass(profile.health)}>{profile.health}</span>
        <span className={trendClass(profile.trend)}>{formatTrendLabel(profile.trend, profile.trendDelta)}</span>
      </span>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.scoreRow}>
        <span className={styles.scoreLabel}>Trust score</span>
        <span className={styles.scoreValue}>{profile.score}</span>
        <span className={trendClass(profile.trend)}>{formatTrendLabel(profile.trend, profile.trendDelta)}</span>
      </div>
      <span className={healthClass(profile.health)}>{profile.health}</span>
    </div>
  )
}
