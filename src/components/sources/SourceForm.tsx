import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ConnectorSourceFields,
  requiresConnectorConfig,
  urlRequiredForSourceType,
} from '@/components/sources/ConnectorSourceFields'
import { useAuth } from '@/hooks/useAuth'
import { ConnectorReadinessBanner } from '@/components/sources/ConnectorReadinessBanner'
import { catalogTypeToConnectorId } from '@/types/connectorSettings'
import { getConnectorReadiness } from '@/services/connectorCredentialService'
import { getDefaultSourceValuesFromSettings } from '@/services/connectorSettingsService'
import type { ConnectorReadiness } from '@/types/connectorSettings'
import * as sourceService from '@/services/sourceService'
import { getConnectorCatalogEntry } from '@/intelligence/connectors/connectorCatalog'
import { sourceDetailPath } from '@/lib/constants'
import type { ConnectorConfig } from '@/types/connectorConfig'
import {
  DEFAULT_SOURCE_VALUES,
  SOURCE_CATEGORIES,
  SOURCE_PRIORITIES,
  SOURCE_STATUSES,
  SOURCE_TYPES,
  type CreateSourceInput,
  type Source,
} from '@/types/source'
import styles from './SourceForm.module.css'

function parseSourceConnectorConfig(source: Source): ConnectorConfig {
  const raw = source.connector_config
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as ConnectorConfig
  }
  return {}
}

function sourceToForm(source: Source): CreateSourceInput {
  return {
    name: source.name,
    source_type: source.source_type,
    category: source.category,
    url: source.url,
    description: source.description,
    status: source.status,
    priority: source.priority,
    update_interval: source.update_interval,
    trust_score: source.trust_score,
    active: source.active,
    connector_config: parseSourceConnectorConfig(source),
  }
}

function defaultUrlForType(sourceType: string): string {
  const entry = getConnectorCatalogEntry(sourceType)
  const type = entry?.type ?? sourceType

  switch (type) {
    case 'NewsAPI':
      return 'https://newsapi.org'
    case 'Google News':
      return 'https://news.google.com'
    case 'Reddit':
      return 'https://www.reddit.com'
    case 'Hacker News':
      return 'https://news.ycombinator.com'
    default:
      return ''
  }
}

interface SourceFormProps {
  mode: 'create' | 'edit'
  source?: Source
  defaultSourceType?: string
}

function resolveDefaultSourceType(defaultSourceType?: string): string {
  if (!defaultSourceType) {
    return DEFAULT_SOURCE_VALUES.source_type
  }

  const catalogEntry = getConnectorCatalogEntry(defaultSourceType)
  if (catalogEntry) {
    return catalogEntry.type
  }

  const matchedType = SOURCE_TYPES.find(
    (type) => type.toLowerCase() === defaultSourceType.trim().toLowerCase(),
  )
  return matchedType ?? DEFAULT_SOURCE_VALUES.source_type
}

function createInitialForm(source?: Source, defaultSourceType?: string): CreateSourceInput {
  if (source) {
    return sourceToForm(source)
  }

  const sourceType = resolveDefaultSourceType(defaultSourceType)
  const base: CreateSourceInput = {
    ...DEFAULT_SOURCE_VALUES,
    source_type: sourceType,
    url: defaultUrlForType(sourceType),
    connector_config: {},
  }

  return base
}

export function SourceForm({ mode, source, defaultSourceType }: SourceFormProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<CreateSourceInput>(() =>
    createInitialForm(source, defaultSourceType),
  )
  const [connectorConfig, setConnectorConfig] = useState<ConnectorConfig>(
    () => form.connector_config ?? {},
  )
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [readiness, setReadiness] = useState<ConnectorReadiness | null>(null)
  const [readinessLoading, setReadinessLoading] = useState(false)

  const connectorId = catalogTypeToConnectorId(form.source_type)

  useEffect(() => {
    if (mode !== 'create') {
      return
    }

    let cancelled = false

    getDefaultSourceValuesFromSettings()
      .then((defaults) => {
        if (!cancelled) {
          setForm((prev) => ({
            ...prev,
            update_interval: defaults.updateInterval,
            trust_score: defaults.trustScore,
          }))
        }
      })
      .catch(() => {
        // Defaults are optional; ignore errors
      })

    return () => {
      cancelled = true
    }
  }, [mode])

  useEffect(() => {
    if (!connectorId) {
      setReadiness(null)
      return
    }

    let cancelled = false
    setReadinessLoading(true)

    getConnectorReadiness(connectorId)
      .then((result) => {
        if (!cancelled) {
          setReadiness(result)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReadiness(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setReadinessLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [connectorId, form.source_type])

  const updateField = <K extends keyof CreateSourceInput>(field: K, value: CreateSourceInput[K]) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }

      if (field === 'source_type' && typeof value === 'string') {
        if (!urlRequiredForSourceType(value)) {
          next.url = defaultUrlForType(value)
        }
      }

      return next
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!user) {
      setError('You must be signed in to manage sources.')
      return
    }

    setError(null)
    setIsSubmitting(true)

    const payload: CreateSourceInput = {
      ...form,
      connector_config: requiresConnectorConfig(form.source_type) ? connectorConfig : {},
    }

    try {
      if (mode === 'create') {
        const created = await sourceService.createSource(payload, user.id)
        navigate(sourceDetailPath(created.id))
      } else if (source) {
        const updated = await sourceService.updateSource(source.id, payload)
        navigate(sourceDetailPath(updated.id))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save source')
    } finally {
      setIsSubmitting(false)
    }
  }

  const showUrlField = urlRequiredForSourceType(form.source_type)

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <div className={styles.error} role="alert">{error}</div>}

      <label className={styles.field}>
        <span className={styles.label}>Name</span>
        <input
          className={styles.input}
          type="text"
          name="name"
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          required
          disabled={isSubmitting}
        />
      </label>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Source type</span>
          <select
            className={styles.select}
            name="source_type"
            value={form.source_type}
            onChange={(e) => updateField('source_type', e.target.value)}
            required
            disabled={isSubmitting || mode === 'edit'}
          >
            {SOURCE_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Category</span>
          <select
            className={styles.select}
            name="category"
            value={form.category}
            onChange={(e) => updateField('category', e.target.value)}
            required
            disabled={isSubmitting}
          >
            {SOURCE_CATEGORIES.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>
      </div>

      {connectorId && (
        <ConnectorReadinessBanner readiness={readiness} isLoading={readinessLoading} />
      )}

      {requiresConnectorConfig(form.source_type) && (
        <ConnectorSourceFields
          sourceType={form.source_type}
          config={connectorConfig}
          onChange={setConnectorConfig}
          disabled={isSubmitting}
        />
      )}

      {showUrlField && (
        <label className={styles.field}>
          <span className={styles.label}>URL</span>
          <input
            className={styles.input}
            type="url"
            name="url"
            value={form.url}
            onChange={(e) => updateField('url', e.target.value)}
            placeholder="https://"
            required
            disabled={isSubmitting}
          />
        </label>
      )}

      <label className={styles.field}>
        <span className={styles.label}>Description</span>
        <textarea
          className={styles.textarea}
          name="description"
          value={form.description}
          onChange={(e) => updateField('description', e.target.value)}
          required
          disabled={isSubmitting}
        />
      </label>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Status</span>
          <select
            className={styles.select}
            name="status"
            value={form.status}
            onChange={(e) => updateField('status', e.target.value)}
            required
            disabled={isSubmitting}
          >
            {SOURCE_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Priority</span>
          <select
            className={styles.select}
            name="priority"
            value={form.priority}
            onChange={(e) => updateField('priority', e.target.value)}
            required
            disabled={isSubmitting}
          >
            {SOURCE_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>{priority}</option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Update interval</span>
          <input
            className={styles.input}
            type="text"
            name="update_interval"
            value={form.update_interval}
            onChange={(e) => updateField('update_interval', e.target.value)}
            placeholder="e.g. 1h, 24h"
            required
            disabled={isSubmitting}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Manual trust bonus</span>
          <input
            className={styles.input}
            type="number"
            name="trust_score"
            value={form.trust_score}
            onChange={(e) => updateField('trust_score', Number(e.target.value))}
            min={0}
            max={100}
            required
            disabled={isSubmitting}
          />
        </label>
      </div>

      <label className={styles.checkboxField}>
        <input
          className={styles.checkbox}
          type="checkbox"
          name="active"
          checked={form.active}
          onChange={(e) => updateField('active', e.target.checked)}
          disabled={isSubmitting}
        />
        Active source (auto sync when scheduler runs)
      </label>

      <button className={styles.button} type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : mode === 'create' ? 'Create source' : 'Save changes'}
      </button>
    </form>
  )
}
