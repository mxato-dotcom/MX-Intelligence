import { getConnectorCatalogEntry } from '@/intelligence/connectors/connectorCatalog'
import type { ConnectorConfig } from '@/types/connectorConfig'
import styles from './ConnectorSourceFields.module.css'

const CONNECTOR_TYPES_WITH_CONFIG = new Set([
  'NewsAPI',
  'News API',
  'Google News',
  'Reddit',
  'Hacker News',
])

export function requiresConnectorConfig(sourceType: string): boolean {
  return CONNECTOR_TYPES_WITH_CONFIG.has(sourceType)
}

export function urlRequiredForSourceType(sourceType: string): boolean {
  return !CONNECTOR_TYPES_WITH_CONFIG.has(sourceType)
}

interface ConnectorSourceFieldsProps {
  sourceType: string
  config: ConnectorConfig
  onChange: (config: ConnectorConfig) => void
  disabled?: boolean
}

export function ConnectorSourceFields({
  sourceType,
  config,
  onChange,
  disabled = false,
}: ConnectorSourceFieldsProps) {
  const catalogEntry = getConnectorCatalogEntry(sourceType)
  const type = catalogEntry?.type ?? sourceType

  const update = (patch: Partial<ConnectorConfig>) => {
    onChange({ ...config, ...patch })
  }

  if (type === 'NewsAPI') {
    return (
      <div className={styles.group}>
        <p className={styles.hint}>
          Requires a NewsAPI key in Settings → API Keys.
        </p>
        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>Mode</span>
            <select
              className={styles.select}
              value={config.mode ?? 'top_headlines'}
              onChange={(e) => update({ mode: e.target.value })}
              disabled={disabled}
            >
              <option value="top_headlines">Top headlines</option>
              <option value="everything">Everything / search</option>
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Country</span>
            <input
              className={styles.input}
              type="text"
              value={config.country ?? ''}
              onChange={(e) => update({ country: e.target.value })}
              placeholder="us"
              disabled={disabled}
            />
          </label>
        </div>
        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>Category</span>
            <input
              className={styles.input}
              type="text"
              value={config.category ?? ''}
              onChange={(e) => update({ category: e.target.value })}
              placeholder="technology"
              disabled={disabled}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Language</span>
            <input
              className={styles.input}
              type="text"
              value={config.language ?? ''}
              onChange={(e) => update({ language: e.target.value })}
              placeholder="en"
              disabled={disabled}
            />
          </label>
        </div>
        <label className={styles.field}>
          <span className={styles.label}>Search query</span>
          <input
            className={styles.input}
            type="text"
            value={config.query ?? ''}
            onChange={(e) => update({ query: e.target.value })}
            placeholder="artificial intelligence"
            disabled={disabled}
          />
        </label>
        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>From date</span>
            <input
              className={styles.input}
              type="date"
              value={config.fromDate ?? ''}
              onChange={(e) => update({ fromDate: e.target.value })}
              disabled={disabled}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>To date</span>
            <input
              className={styles.input}
              type="date"
              value={config.toDate ?? ''}
              onChange={(e) => update({ toDate: e.target.value })}
              disabled={disabled}
            />
          </label>
        </div>
      </div>
    )
  }

  if (type === 'Google News') {
    return (
      <div className={styles.group}>
        <label className={styles.field}>
          <span className={styles.label}>Search query</span>
          <input
            className={styles.input}
            type="text"
            value={config.query ?? ''}
            onChange={(e) => update({ query: e.target.value })}
            placeholder="cybersecurity"
            disabled={disabled}
          />
        </label>
        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>Region</span>
            <input
              className={styles.input}
              type="text"
              value={config.region ?? ''}
              onChange={(e) => update({ region: e.target.value })}
              placeholder="US"
              disabled={disabled}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Language</span>
            <input
              className={styles.input}
              type="text"
              value={config.language ?? ''}
              onChange={(e) => update({ language: e.target.value })}
              placeholder="en-US"
              disabled={disabled}
            />
          </label>
        </div>
        <label className={styles.field}>
          <span className={styles.label}>Topic ID (optional)</span>
          <input
            className={styles.input}
            type="text"
            value={config.topic ?? ''}
            onChange={(e) => update({ topic: e.target.value })}
            placeholder="CAAqIggKIhBI0LrPsRItGAECGAvDnQI"
            disabled={disabled}
          />
        </label>
      </div>
    )
  }

  if (type === 'Reddit') {
    return (
      <div className={styles.group}>
        <label className={styles.field}>
          <span className={styles.label}>Subreddit</span>
          <input
            className={styles.input}
            type="text"
            value={config.subreddit ?? ''}
            onChange={(e) => update({ subreddit: e.target.value })}
            placeholder="worldnews"
            disabled={disabled}
          />
        </label>
        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>Sort</span>
            <select
              className={styles.select}
              value={config.sort ?? 'hot'}
              onChange={(e) => update({ sort: e.target.value })}
              disabled={disabled}
            >
              <option value="hot">Hot</option>
              <option value="new">New</option>
              <option value="top">Top</option>
              <option value="search">Search</option>
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Search query</span>
            <input
              className={styles.input}
              type="text"
              value={config.query ?? ''}
              onChange={(e) => update({ query: e.target.value })}
              placeholder="For search mode"
              disabled={disabled}
            />
          </label>
        </div>
      </div>
    )
  }

  if (type === 'Hacker News') {
    return (
      <div className={styles.group}>
        <label className={styles.field}>
          <span className={styles.label}>Feed</span>
          <select
            className={styles.select}
            value={config.feed ?? 'top'}
            onChange={(e) => update({ feed: e.target.value })}
            disabled={disabled}
          >
            <option value="top">Top</option>
            <option value="new">New</option>
            <option value="best">Best</option>
            <option value="ask">Ask HN</option>
            <option value="show">Show HN</option>
            <option value="jobs">Jobs</option>
          </select>
        </label>
      </div>
    )
  }

  return null
}
