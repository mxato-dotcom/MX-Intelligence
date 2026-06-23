import { LoginForm } from '@/components/auth/LoginForm'
import styles from '@/pages/AuthPage.module.css'

export function LoginPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>MX</span>
          <div>
            <h1 className={styles.title}>MX Intelligence</h1>
            <p className={styles.subtitle}>Sign in to your personal intelligence workspace</p>
          </div>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
