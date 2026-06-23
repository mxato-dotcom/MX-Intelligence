import styles from './AuthLoading.module.css'

export function AuthLoading() {
  return (
    <div className={styles.page}>
      <div className={styles.spinner} aria-hidden="true" />
      <p className={styles.text}>Loading…</p>
    </div>
  )
}
