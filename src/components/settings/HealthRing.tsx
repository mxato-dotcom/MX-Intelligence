import { getHealthLevel } from '@/components/settings/HealthIndicator'
import styles from './HealthRing.module.css'

interface HealthRingProps {
  percent: number
  label?: string
}

const RADIUS = 36
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function HealthRing({ percent, label = 'Health' }: HealthRingProps) {
  const level = getHealthLevel(percent)
  const offset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE
  const fillClass =
    level === 'high' ? styles.fillHigh : level === 'medium' ? styles.fillMedium : styles.fillLow

  return (
    <div className={styles.wrap}>
      <div className={styles.ring}>
        <svg className={styles.svg} viewBox="0 0 88 88" aria-hidden="true">
          <circle className={styles.track} cx="44" cy="44" r={RADIUS} />
          <circle
            className={`${styles.fill} ${fillClass}`}
            cx="44"
            cy="44"
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        </svg>
        <div className={styles.center}>
          <span className={styles.percent}>{percent}%</span>
        </div>
      </div>
      <span className={styles.label}>{label}</span>
    </div>
  )
}
