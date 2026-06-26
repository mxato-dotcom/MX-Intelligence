import type { BriefExportInput } from '@/utils/exportBrief'
import {
  copyToClipboard,
  downloadBriefJson,
  downloadBriefMarkdown,
} from '@/utils/exportBrief'
import styles from './BriefExportActions.module.css'

interface BriefExportActionsProps {
  exportInput: BriefExportInput
  onMessage: (message: { type: 'success' | 'error'; text: string }) => void
}

export function BriefExportActions({ exportInput, onMessage }: BriefExportActionsProps) {
  const { brief } = exportInput

  const handleCopyExecutive = async () => {
    try {
      await copyToClipboard(brief.executiveSummary)
      onMessage({ type: 'success', text: 'Executive summary copied to clipboard.' })
    } catch {
      onMessage({ type: 'error', text: 'Failed to copy executive summary.' })
    }
  }

  const handleCopySummary = async () => {
    try {
      await copyToClipboard(brief.summary)
      onMessage({ type: 'success', text: 'Brief summary copied to clipboard.' })
    } catch {
      onMessage({ type: 'error', text: 'Failed to copy brief summary.' })
    }
  }

  const handleExportMarkdown = () => {
    try {
      downloadBriefMarkdown(exportInput)
      onMessage({ type: 'success', text: 'Markdown report downloaded.' })
    } catch {
      onMessage({ type: 'error', text: 'Failed to export Markdown.' })
    }
  }

  const handleExportJson = () => {
    try {
      downloadBriefJson(exportInput)
      onMessage({ type: 'success', text: 'JSON report downloaded.' })
    } catch {
      onMessage({ type: 'error', text: 'Failed to export JSON.' })
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className={styles.exportBar}>
      <h3 className={styles.exportTitle}>Export &amp; share</h3>
      <div className={styles.exportActions}>
        <button type="button" className={styles.exportButton} onClick={handleExportMarkdown}>
          Export Markdown
        </button>
        <button type="button" className={styles.exportButton} onClick={handleExportJson}>
          Export JSON
        </button>
        <button type="button" className={styles.exportButton} onClick={handleCopySummary}>
          Copy Brief Summary
        </button>
        <button type="button" className={styles.exportButton} onClick={handleCopyExecutive}>
          Copy Executive Summary
        </button>
        <button type="button" className={styles.exportButtonPrimary} onClick={handlePrint}>
          Print Brief
        </button>
      </div>
    </div>
  )
}
