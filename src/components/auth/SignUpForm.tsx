import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getAuthErrorMessage } from '@/lib/errors'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/lib/constants'
import styles from '@/pages/AuthPage.module.css'

export function SignUpForm() {
  const { signUp } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      const { needsEmailConfirmation } = await signUp({
        email,
        password,
        displayName,
      })

      if (needsEmailConfirmation) {
        setSuccess('Account created. Check your email to confirm your account, then sign in.')
        setPassword('')
      }
    } catch (err) {
      setError(getAuthErrorMessage(err as Error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <div className={styles.error} role="alert">{error}</div>}
      {success && <div className={styles.success} role="status">{success}</div>}

      <label className={styles.field}>
        <span className={styles.label}>Display name</span>
        <input
          className={styles.input}
          type="text"
          name="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          autoComplete="name"
          disabled={isSubmitting}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Email</span>
        <input
          className={styles.input}
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
          disabled={isSubmitting}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Password</span>
        <input
          className={styles.input}
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          autoComplete="new-password"
          required
          minLength={6}
          disabled={isSubmitting}
        />
      </label>

      <button className={styles.button} type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </button>

      <p className={styles.footer}>
        Already have an account? <Link to={ROUTES.LOGIN}>Sign in</Link>
      </p>
    </form>
  )
}
