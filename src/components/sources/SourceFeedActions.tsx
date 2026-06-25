import { useState } from 'react'
import { FeedPreviewModal } from '@/components/sources/FeedPreviewModal'
import { formatImportSummary, ImportSummaryCard } from '@/components/sources/ImportSummaryCard'
import { useAuth } from '@/hooks/useAuth'
import { useDataRefresh } from '@/contexts/DataRefreshContext'
import type { NormalizedIntelligenceArticle } from '@/intelligence/types'
import { mapRssError } from '@/lib/rssErrors'
import { supportsRssFeed } from '@/lib/sourceType'
import * as collectorService from '@/services/collectorService'
import * as rssService from '@/services/rssService'
import type { FeedImportResult } from '@/types/rss'
import type { Source } from '@/types/source'
import styles from './SourceFeedActions.module.css'

interface SourceFeedActionsProps {
  source: Source
  onSourceUpdated?: () => void
  compact?: boolean
}

const RSS_ONLY_MESSAGE = 'Preview and import require a source with type RSS.'

export function SourceFeedActions({ source, onSourceUpdated, compact = false }: SourceFeedActionsProps) {
  const { user } = useAuth()
  const { notifyDataRefresh } = useDataRefresh()
  const canUseRssFeed = supportsRssFeed(source.source_type)

  const [isValidating, setIsValidating] = useState(false)
  const [isHealthChecking, setIsHealthChecking] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importStage, setImportStage] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState(true)
  const [previewItems, setPreviewItems] = useState<NormalizedIntelligenceArticle[]>([])
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [importResult, setImportResult] = useState<FeedImportResult | null>(null)

  const handleValidate = async () => {
    setIsValidating(true)
    setActionMessage(null)

    try {
      const result = await collectorService.validateSource(source)
      setActionSuccess(result.success)
      setActionMessage(result.message)
    } catch (err) {
      setActionSuccess(false)
      setActionMessage(err instanceof Error ? err.message : 'Validation failed')
    } finally {
      setIsValidating(false)
    }
  }

  const handleHealthCheck = async () => {
    setIsHealthChecking(true)
    setActionMessage(null)

    try {
      const result = await collectorService.runHealthCheck(source)
      setActionSuccess(result.success)
      setActionMessage(result.message)
    } catch (err) {
      setActionSuccess(false)
      setActionMessage(err instanceof Error ? err.message : 'Health check failed')
    } finally {
      setIsHealthChecking(false)
    }
  }

  const handlePreviewFeed = async () => {
    if (!canUseRssFeed) {
      setActionSuccess(false)
      setActionMessage(RSS_ONLY_MESSAGE)
      return
    }

    setIsPreviewing(true)
    setActionMessage(null)
    setImportResult(null)
    setImportStage('Fetching feed via Edge Function…')

    try {
      const result = await rssService.previewFeed(source)

      if (!result.success) {
        setActionSuccess(false)
        setActionMessage(result.error ?? 'Failed to preview feed')
        return
      }

      setPreviewItems(result.items)
      setIsPreviewOpen(true)
      setActionSuccess(true)
      setActionMessage(`Preview ready — ${result.downloaded} feed items.`)
    } catch (err) {
      setActionSuccess(false)
      setActionMessage(mapRssError(err))
    } finally {
      setIsPreviewing(false)
      setImportStage(null)
    }
  }

  const runImport = async (
    selectedHashes?: string[],
    cachedItems?: NormalizedIntelligenceArticle[],
  ) => {
    if (!canUseRssFeed) {
      setActionSuccess(false)
      setActionMessage(RSS_ONLY_MESSAGE)
      return
    }

    if (!user) {
      setActionSuccess(false)
      setActionMessage('You must be signed in to import articles.')
      return
    }

    setIsImporting(true)
    setActionMessage(null)
    setImportStage('Fetching feed via Edge Function…')

    try {
      setImportStage('Importing articles and skipping duplicates…')

      const result = cachedItems
        ? await rssService.importFeed({
            source,
            userId: user.id,
            selectedHashes,
            items: cachedItems,
          })
        : await rssService.importArticlesFromFeed(source, user.id, selectedHashes)

      setImportResult(result)
      setActionSuccess(result.imported > 0 || result.skipped > 0)
      setActionMessage(formatImportSummary(result))
      setIsPreviewOpen(false)
      notifyDataRefresh()
      onSourceUpdated?.()
    } catch (err) {
      setActionSuccess(false)
      setActionMessage(mapRssError(err))
    } finally {
      setIsImporting(false)
      setImportStage(null)
    }
  }

  const handleImportSelected = async (selectedHashes: string[]) => {
    await runImport(selectedHashes, previewItems)
  }

  const handleImportAll = async () => {
    await runImport()
  }

  const isBusy = isValidating || isHealthChecking || isPreviewing || isImporting

  return (
    <div className={compact ? styles.compact : styles.wrapper}>
      <div className={styles.actions}>
        <button
          className={styles.actionButton}
          type="button"
          onClick={handleValidate}
          disabled={isBusy}
        >
          {isValidating ? 'Validating…' : 'Validate'}
        </button>
        <button
          className={styles.actionButton}
          type="button"
          onClick={handleHealthCheck}
          disabled={isBusy}
        >
          {isHealthChecking ? 'Checking…' : 'Health Check'}
        </button>
        <button
          className={styles.actionButton}
          type="button"
          onClick={handlePreviewFeed}
          disabled={isBusy}
        >
          {isPreviewing ? 'Loading…' : 'Preview Feed'}
        </button>
        <button
          className={`${styles.actionButton} ${styles.importButtonPrimary}`}
          type="button"
          onClick={handleImportAll}
          disabled={isBusy}
        >
          {isImporting && !isPreviewOpen ? 'Importing…' : 'Import Articles'}
        </button>
      </div>

      {!canUseRssFeed && (
        <p className={styles.hint}>{RSS_ONLY_MESSAGE}</p>
      )}

      {(isPreviewing || isImporting) && importStage && (
        <div className={styles.progress} role="status" aria-live="polite">
          <p className={styles.progressLabel}>{importStage}</p>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} />
          </div>
        </div>
      )}

      {actionMessage && (
        <p
          className={
            actionSuccess
              ? `${styles.message} ${styles.messageSuccess}`
              : `${styles.message} ${styles.messageError}`
          }
          role="status"
        >
          {actionMessage}
        </p>
      )}

      {importResult && <ImportSummaryCard result={importResult} />}

      <FeedPreviewModal
        isOpen={isPreviewOpen}
        items={previewItems}
        isImporting={isImporting}
        onClose={() => setIsPreviewOpen(false)}
        onImport={handleImportSelected}
      />
    </div>
  )
}
