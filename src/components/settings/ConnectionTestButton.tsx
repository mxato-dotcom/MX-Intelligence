import { ConnectionResultCard } from '@/components/settings/ConnectionResultCard'
import { useConnectionTest } from '@/components/settings/useConnectionTest'
import type { ConnectorId } from '@/types/connectorSettings'
import styles from './ConnectionTestButton.module.css'

interface ConnectionTestButtonProps {
  connectorId: ConnectorId
  connectorName?: string
  onComplete?: () => void
  disabled?: boolean
  compact?: boolean
}

export function ConnectionTestButton({
  connectorId,
  connectorName,
  onComplete,
  disabled = false,
  compact = false,
}: ConnectionTestButtonProps) {
  const { test, status, message, latencyMs, testedAt, isTesting } = useConnectionTest({
    connectorId,
    connectorName,
    onComplete,
  })

  return (
    <div className={compact ? styles.wrapCompact : styles.wrap}>
      <button
        type="button"
        className={compact ? styles.compactBtn : styles.testBtn}
        onClick={test}
        disabled={disabled || isTesting}
      >
        {!compact && <span className={styles.testIcon} aria-hidden="true">↻</span>}
        {isTesting ? 'Testing…' : compact ? 'Test' : 'Test Connection'}
      </button>
      {!compact && (
        <ConnectionResultCard
          status={status}
          message={message}
          latencyMs={latencyMs}
          testedAt={testedAt}
          isLoading={isTesting}
          connectorName={connectorName}
        />
      )}
    </div>
  )
}

export function ConnectionTestTrigger({
  onClick,
  isTesting,
  disabled,
}: {
  onClick: () => void
  isTesting: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      className={styles.testBtn}
      onClick={onClick}
      disabled={disabled || isTesting}
    >
      <span className={styles.testIcon} aria-hidden="true">↻</span>
      {isTesting ? 'Testing…' : 'Test Connection'}
    </button>
  )
}
