import { SignUpForm } from '@/components/auth/SignUpForm'
import styles from '@/pages/AuthPage.module.css'

export function SignUpPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>MX</span>
          <div>
            <h1 className={styles.title}>Create account</h1>
            <p className={styles.subtitle}>Start building your personal intelligence workspace</p>
          </div>
        </div>
        <SignUpForm />
      </div>
    </div>
  )
}
