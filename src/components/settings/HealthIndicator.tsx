import styles from './HealthIndicator.module.css'

export type HealthLevel = 'high' | 'medium' | 'low'

interface HealthIndicatorProps {
  percent: number
  label?: string
}

export function getHealthLevel(percent: number): HealthLevel {
  if (percent >= 75) {
    return 'high'
  }
  if (percent >= 40) {
    return 'medium'
  }
  return 'low'
}

export function computeHealthPercent(
  connected: boolean,
  credentialStatus: string,
  lastTestStatus: string | null,
  lastFailureAt: string | null,
): number {
  if (credentialStatus === 'missing') {
    return 0
  }

  let score = 50

  if (credentialStatus === 'configured') {
    score += 20
  }

  if (connected) {
    score += 15
  }

  if (lastTestStatus === 'connected') {
    score += 15
  } else if (lastTestStatus === 'rate_limited') {
    score -= 10
  } else if (lastTestStatus === 'auth_failed') {
    score -= 30
  }

  if (lastFailureAt) {
    const failureAge = Date.now() - new Date(lastFailureAt).getTime()
    if (failureAge < 24 * 60 * 60 * 1000) {
      score -= 20
    }
  }

  return Math.max(0, Math.min(100, score))
}

export function HealthIndicator({ percent, label = 'Health' }: HealthIndicatorProps) {
  const level = getHealthLevel(percent)

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <span className={styles.sublabel}>{label}</span>
        <span className={styles.label}>{percent}%</span>
      </div>
      <div className={styles.indicator}>
        <div className={styles.barTrack}>
          <div
            className={`${styles.barFill} ${styles[level]}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  )
}
