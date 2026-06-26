export function safeString(value: string | null | undefined): string {
  return value ?? ''
}

export function safeTrim(value: string | null | undefined): string {
  return safeString(value).trim()
}

export function safeSlice(
  value: string | null | undefined,
  start: number,
  end?: number,
): string {
  return safeString(value).slice(start, end)
}

export function safeStringOr(
  value: string | null | undefined,
  fallback: string,
): string {
  const trimmed = safeTrim(value)
  return trimmed.length > 0 ? trimmed : fallback
}
