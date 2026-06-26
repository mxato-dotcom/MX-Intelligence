export type ParsedIntervalKind = 'minutes' | 'hours' | 'days' | 'weekly' | 'manual'

export interface ParsedUpdateInterval {
  kind: ParsedIntervalKind
  minutes: number
  label: string
}

const INTERVAL_MINUTES: Record<string, number> = {
  '5m': 5,
  '15m': 15,
  '30m': 30,
  '1h': 60,
  '6h': 360,
  '12h': 720,
  '24h': 1440,
  daily: 1440,
  weekly: 10080,
}

const INTERVAL_LABELS: Record<string, string> = {
  '5m': 'Every 5 minutes',
  '15m': 'Every 15 minutes',
  '30m': 'Every 30 minutes',
  '1h': 'Every hour',
  '6h': 'Every 6 hours',
  '12h': 'Every 12 hours',
  '24h': 'Every 24 hours',
  daily: 'Daily',
  weekly: 'Weekly',
  manual: 'Manual only',
}

export function parseUpdateInterval(interval: string): ParsedUpdateInterval | null {
  const normalized = interval.trim().toLowerCase()

  if (normalized === 'manual') {
    return { kind: 'manual', minutes: 0, label: INTERVAL_LABELS.manual }
  }

  const minutes = INTERVAL_MINUTES[normalized]
  if (minutes === undefined) {
    return null
  }

  let kind: ParsedIntervalKind = 'minutes'
  if (normalized === 'weekly') {
    kind = 'weekly'
  } else if (minutes >= 1440) {
    kind = 'days'
  } else if (minutes >= 60) {
    kind = 'hours'
  }

  return {
    kind,
    minutes,
    label: INTERVAL_LABELS[normalized] ?? interval.trim(),
  }
}

export function getNextSyncAt(
  lastSyncAt: string | null,
  updateInterval: string,
): string | null {
  const parsed = parseUpdateInterval(updateInterval)

  if (!parsed || parsed.kind === 'manual') {
    return null
  }

  if (!lastSyncAt) {
    return new Date().toISOString()
  }

  const lastSync = new Date(lastSyncAt)
  if (Number.isNaN(lastSync.getTime())) {
    return new Date().toISOString()
  }

  return new Date(lastSync.getTime() + parsed.minutes * 60 * 1000).toISOString()
}

export function isSyncDue(lastSyncAt: string | null, updateInterval: string): boolean {
  const parsed = parseUpdateInterval(updateInterval)

  if (!parsed || parsed.kind === 'manual') {
    return false
  }

  if (!lastSyncAt) {
    return true
  }

  const nextSyncAt = getNextSyncAt(lastSyncAt, updateInterval)
  if (!nextSyncAt) {
    return false
  }

  return Date.now() >= new Date(nextSyncAt).getTime()
}

export function formatNextSyncLabel(
  lastSyncAt: string | null,
  updateInterval: string,
): string {
  const parsed = parseUpdateInterval(updateInterval)

  if (!parsed || parsed.kind === 'manual') {
    return 'Manual only'
  }

  if (!lastSyncAt || isSyncDue(lastSyncAt, updateInterval)) {
    return 'Due now'
  }

  const nextSyncAt = getNextSyncAt(lastSyncAt, updateInterval)
  if (!nextSyncAt) {
    return 'Not scheduled'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(nextSyncAt))
}

export function formatIntervalLabel(updateInterval: string): string {
  const parsed = parseUpdateInterval(updateInterval)
  return parsed?.label ?? updateInterval.trim()
}
