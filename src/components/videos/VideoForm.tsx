import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { videoDetailPath } from '@/lib/constants'
import * as videoService from '@/services/videoService'
import type { CreateVideoInput } from '@/types/video'
import styles from './VideoForm.module.css'

const emptyForm: CreateVideoInput = {
  title: '',
  source: '',
  url: '',
  thumbnail_url: '',
  description: '',
  category: '',
}

export function VideoForm() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<CreateVideoInput>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateField = (field: keyof CreateVideoInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!user) {
      setError('You must be signed in to create a video.')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const video = await videoService.createVideo(form, user.id)
      navigate(videoDetailPath(video.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create video')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <div className={styles.error} role="alert">{error}</div>}

      <label className={styles.field}>
        <span className={styles.label}>Title</span>
        <input
          className={styles.input}
          type="text"
          name="title"
          value={form.title}
          onChange={(e) => updateField('title', e.target.value)}
          required
          disabled={isSubmitting}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Source</span>
        <input
          className={styles.input}
          type="text"
          name="source"
          value={form.source}
          onChange={(e) => updateField('source', e.target.value)}
          placeholder="Channel or platform name"
          required
          disabled={isSubmitting}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>URL</span>
        <input
          className={styles.input}
          type="url"
          name="url"
          value={form.url}
          onChange={(e) => updateField('url', e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          required
          disabled={isSubmitting}
        />
        <span className={styles.hint}>YouTube links will embed on the detail page.</span>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Thumbnail URL</span>
        <input
          className={styles.input}
          type="url"
          name="thumbnail_url"
          value={form.thumbnail_url}
          onChange={(e) => updateField('thumbnail_url', e.target.value)}
          placeholder="https:// (optional)"
          disabled={isSubmitting}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Category</span>
        <input
          className={styles.input}
          type="text"
          name="category"
          value={form.category}
          onChange={(e) => updateField('category', e.target.value)}
          placeholder="e.g. Technology, Finance"
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
          placeholder="Short description for the video list"
          required
          disabled={isSubmitting}
        />
      </label>

      <button className={styles.button} type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : 'Publish video'}
      </button>
    </form>
  )
}
