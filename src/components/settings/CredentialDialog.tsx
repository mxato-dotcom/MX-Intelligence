import styles from './CredentialDialog.module.css'
import shared from './settingsShared.module.css'

interface CredentialDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  isProcessing?: boolean
  variant?: 'danger' | 'default'
}

export function CredentialDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isProcessing = false,
  variant = 'default',
}: CredentialDialogProps) {
  if (!open) {
    return null
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="credential-dialog-title">
      <div className={styles.dialog}>
        <h3 id="credential-dialog-title" className={styles.title}>{title}</h3>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={shared.buttonSecondary}
            onClick={onCancel}
            disabled={isProcessing}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={variant === 'danger' ? shared.buttonDanger : shared.button}
            onClick={onConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
