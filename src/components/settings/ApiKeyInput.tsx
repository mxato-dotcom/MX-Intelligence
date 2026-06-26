import { useState } from 'react'
import styles from './ApiKeyInput.module.css'
import shared from './settingsShared.module.css'

interface ApiKeyInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  hint?: string
}

export function ApiKeyInput({
  label,
  value,
  onChange,
  placeholder = 'Paste secret value',
  disabled = false,
  hint,
}: ApiKeyInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className={styles.wrap}>
      <label className={shared.field}>
        <span className={shared.label}>{label}</span>
        <div className={styles.inputRow}>
          <input
            className={styles.input}
            type={visible ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
          />
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={() => setVisible((v) => !v)}
            disabled={disabled}
            aria-label={visible ? 'Hide value' : 'Show value'}
          >
            {visible ? '🙈' : '👁'}
          </button>
        </div>
        {hint && (
          <span className={styles.hint}>
            <span className={styles.hintIcon} aria-hidden="true">🔒</span>
            {hint}
          </span>
        )}
      </label>
    </div>
  )
}
