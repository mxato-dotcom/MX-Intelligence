import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { articleDetailPath } from '@/lib/constants'
import * as articleService from '@/services/articleService'
import type { CreateArticleInput } from '@/types/article'
import styles from './ArticleForm.module.css'

const emptyForm: CreateArticleInput = {
  title: '',
  source: '',
  url: '',
  content: '',
  summary: '',
  category: '',
}

export function ArticleForm() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<CreateArticleInput>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateField = (field: keyof CreateArticleInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!user) {
      setError('You must be signed in to create an article.')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const article = await articleService.createArticle(form, user.id)
      navigate(articleDetailPath(article.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create article')
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
          placeholder="Publisher or site name"
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
          placeholder="https://"
          required
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
        <span className={styles.label}>Summary</span>
        <textarea
          className={styles.textarea}
          name="summary"
          value={form.summary}
          onChange={(e) => updateField('summary', e.target.value)}
          placeholder="Short description for the article list"
          required
          disabled={isSubmitting}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Content</span>
        <textarea
          className={`${styles.textarea} ${styles.contentTextarea}`}
          name="content"
          value={form.content}
          onChange={(e) => updateField('content', e.target.value)}
          placeholder="Full article text"
          required
          disabled={isSubmitting}
        />
      </label>

      <button className={styles.button} type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : 'Publish article'}
      </button>
    </form>
  )
}
