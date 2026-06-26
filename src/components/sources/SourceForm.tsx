import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { sourceDetailPath } from '@/lib/constants'
import * as sourceService from '@/services/sourceService'
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
  }
}

interface SourceFormProps {
  mode: 'create' | 'edit'
  source?: Source
  defaultSourceType?: string
}

function createInitialForm(source?: Source, defaultSourceType?: string): CreateSourceInput {
  if (source) {
    return sourceToForm(source)
  }

  const base = { ...DEFAULT_SOURCE_VALUES }

  if (defaultSourceType && SOURCE_TYPES.includes(defaultSourceType as typeof SOURCE_TYPES[number])) {
    base.source_type = defaultSourceType
  }

  return base
}

export function SourceForm({ mode, source, defaultSourceType }: SourceFormProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<CreateSourceInput>(() => createInitialForm(source, defaultSourceType))
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateField = <K extends keyof CreateSourceInput>(field: K, value: CreateSourceInput[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!user) {
      setError('You must be signed in to manage sources.')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      if (mode === 'create') {
        const created = await sourceService.createSource(form, user.id)
        navigate(sourceDetailPath(created.id))
      } else if (source) {
        const updated = await sourceService.updateSource(source.id, form)
        navigate(sourceDetailPath(updated.id))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save source')
    } finally {
      setIsSubmitting(false)
    }
  }

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
            disabled={isSubmitting}
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
        Active source
      </label>

      <button className={styles.button} type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : mode === 'create' ? 'Create source' : 'Save changes'}
      </button>
    </form>
  )
}
