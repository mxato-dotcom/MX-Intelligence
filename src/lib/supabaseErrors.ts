interface PostgrestErrorLike {
  code?: string
  message?: string
}

function getErrorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as PostgrestErrorLike).code ?? '')
  }

  return ''
}

export function getSupabaseErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as PostgrestErrorLike).message ?? '')
  }

  return String(error ?? '')
}

/** True when the queried table/view is absent from the database or PostgREST schema cache. */
export function isMissingTableError(error: unknown): boolean {
  const code = getErrorCode(error)
  const message = getSupabaseErrorMessage(error).toLowerCase()

  if (code === '42P01' || code === 'PGRST205') {
    return true
  }

  return (
    message.includes('could not find the table') ||
    (message.includes('relation') && message.includes('does not exist'))
  )
}

/** True when a referenced column is absent (e.g. pre-migration daily_briefs schema). */
export function isMissingColumnError(error: unknown): boolean {
  const code = getErrorCode(error)
  const message = getSupabaseErrorMessage(error).toLowerCase()

  if (code === '42703' || code === 'PGRST204') {
    return true
  }

  return message.includes('column') && message.includes('does not exist')
}

export function isMissingSchemaError(error: unknown): boolean {
  return isMissingTableError(error) || isMissingColumnError(error)
}
