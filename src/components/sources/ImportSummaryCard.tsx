import type { FeedImportResult } from '@/types/rss'
import styles from './ImportSummaryCard.module.css'

interface ImportSummaryCardProps {
  result: FeedImportResult
}

export function ImportSummaryCard({ result }: ImportSummaryCardProps) {
  return (
    <div className={styles.card}>
      <h4 className={styles.title}>Import complete</h4>
      <p className={styles.summaryLine}>
        Imported {result.imported} · Duplicates skipped {result.skipped} · Updated{' '}
        {result.updated} · Failed {result.failed}
      </p>
      <div className={styles.grid}>
        <div className={styles.item}>
          <span className={styles.label}>Downloaded</span>
          <span className={styles.value}>{result.downloaded}</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Imported</span>
          <span className={styles.value}>{result.imported}</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Duplicates skipped</span>
          <span className={styles.value}>{result.skipped}</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Updated existing</span>
          <span className={styles.value}>{result.updated}</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Failed</span>
          <span className={styles.value}>{result.failed}</span>
        </div>
      </div>
      <p className={styles.duration}>Duration: {result.durationMs}ms</p>
    </div>
  )
}

function formatImportSummary(result: FeedImportResult): string {
  return `Imported ${result.imported} · Duplicates skipped ${result.skipped} · Updated ${result.updated} · Failed ${result.failed}`
}

export { formatImportSummary }
