import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/format'
import type { NormalizedIntelligenceArticle } from '@/intelligence/types'
import styles from './FeedPreviewModal.module.css'

interface FeedPreviewModalProps {
  isOpen: boolean
  items: NormalizedIntelligenceArticle[]
  isImporting: boolean
  onClose: () => void
  onImport: (selectedHashes: string[]) => void
}

export function FeedPreviewModal({
  isOpen,
  items,
  isImporting,
  onClose,
  onImport,
}: FeedPreviewModalProps) {
  const [selectedHashes, setSelectedHashes] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen) {
      setSelectedHashes(new Set(items.map((item) => item.hash)))
    }
  }, [isOpen, items])

  if (!isOpen) {
    return null
  }

  const toggleItem = (hash: string) => {
    setSelectedHashes((prev) => {
      const next = new Set(prev)
      if (next.has(hash)) {
        next.delete(hash)
      } else {
        next.add(hash)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (selectedHashes.size === items.length) {
      setSelectedHashes(new Set())
    } else {
      setSelectedHashes(new Set(items.map((item) => item.hash)))
    }
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="feed-preview-title">
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h3 id="feed-preview-title" className={styles.title}>Feed preview</h3>
            <p className={styles.totalCount}>{items.length} feed items</p>
          </div>
          <button className={styles.closeButton} type="button" onClick={onClose} disabled={isImporting}>
            Close
          </button>
        </div>

        <div className={styles.body}>
          {items.length === 0 ? (
            <p className={styles.empty}>No items to preview.</p>
          ) : (
            <>
              <button className={styles.selectAllButton} type="button" onClick={toggleAll} disabled={isImporting}>
                {selectedHashes.size === items.length ? 'Deselect all' : 'Select all'}
              </button>
              {items.map((item) => (
                <article key={item.hash} className={styles.item}>
                  <input
                    className={styles.checkbox}
                    type="checkbox"
                    checked={selectedHashes.has(item.hash)}
                    onChange={() => toggleItem(item.hash)}
                    disabled={isImporting}
                    aria-label={`Select ${item.title}`}
                  />
                  {item.image && (
                    <img className={styles.thumbnail} src={item.image} alt="" loading="lazy" />
                  )}
                  <div className={styles.content}>
                    <p className={styles.fieldLabel}>Title</p>
                    <h4 className={styles.itemTitle}>{item.title}</h4>
                    <p className={styles.fieldLabel}>Published</p>
                    <time className={styles.itemDate} dateTime={item.published_at}>
                      {formatDate(item.published_at)}
                    </time>
                    {item.summary && (
                      <>
                        <p className={styles.fieldLabel}>Description</p>
                        <p className={styles.itemSummary}>{item.summary}</p>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </>
          )}
        </div>

        <div className={styles.footer}>
          <span className={styles.selectedCount}>
            {selectedHashes.size} of {items.length} selected
          </span>
          <button
            className={styles.importButton}
            type="button"
            onClick={() => onImport(Array.from(selectedHashes))}
            disabled={isImporting || selectedHashes.size === 0}
          >
            {isImporting ? 'Importing…' : 'Import selected'}
          </button>
        </div>
      </div>
    </div>
  )
}
