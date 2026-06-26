import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/format'
import { safeStringOr } from '@/lib/safeString'
import type { IntelligenceItem } from '@/intelligence/types/IntelligenceItem'
import styles from './FeedPreviewModal.module.css'

interface FeedPreviewModalProps {
  isOpen: boolean
  items: IntelligenceItem[]
  isImporting: boolean
  onClose: () => void
  onImport: (selectedIds: string[]) => void
}

export function FeedPreviewModal({
  isOpen,
  items,
  isImporting,
  onClose,
  onImport,
}: FeedPreviewModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(items.map((item) => item.id)))
    }
  }, [isOpen, items])

  if (!isOpen) {
    return null
  }

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)))
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
                {selectedIds.size === items.length ? 'Deselect all' : 'Select all'}
              </button>
              {items.map((item) => (
                <article key={item.id} className={styles.item}>
                  <input
                    className={styles.checkbox}
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleItem(item.id)}
                    disabled={isImporting}
                    aria-label={`Select ${safeStringOr(item.title, 'Untitled')}`}
                  />
                  {item.imageUrl && (
                    <img className={styles.thumbnail} src={item.imageUrl} alt="" loading="lazy" />
                  )}
                  <div className={styles.content}>
                    <p className={styles.fieldLabel}>Title</p>
                    <h4 className={styles.itemTitle}>{safeStringOr(item.title, 'Untitled')}</h4>
                    <p className={styles.fieldLabel}>Published</p>
                    <time className={styles.itemDate} dateTime={item.publishedAt}>
                      {formatDate(item.publishedAt)}
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
            {selectedIds.size} of {items.length} selected
          </span>
          <button
            className={styles.importButton}
            type="button"
            onClick={() => onImport(Array.from(selectedIds))}
            disabled={isImporting || selectedIds.size === 0}
          >
            {isImporting ? 'Importing…' : 'Import selected'}
          </button>
        </div>
      </div>
    </div>
  )
}
