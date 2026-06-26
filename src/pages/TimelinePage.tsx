import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TimelineEventCard } from '@/components/timeline/TimelineEventCard'
import { PageContainer } from '@/components/layout/PageContainer'
import { useDataRefresh } from '@/contexts/DataRefreshContext'
import {
  filterTimeline,
  getTimeline,
  searchTimeline,
} from '@/services/timelineService'
import type { TimelineEventType, TimelineFilters } from '@/types/timeline'
import { TIMELINE_EVENT_TYPES, TIMELINE_RISK_OPTIONS } from '@/types/timeline'
import styles from './TimelinePage.module.css'

export function TimelinePage() {
  const { refreshToken } = useDataRefresh()
  const [searchParams] = useSearchParams()
  const clusterParam = searchParams.get('cluster') ?? ''

  const [events, setEvents] = useState<Awaited<ReturnType<typeof getTimeline>>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [minConfidence, setMinConfidence] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [technologyFilter, setTechnologyFilter] = useState('')
  const [organizationFilter, setOrganizationFilter] = useState('')
  const [riskFilter, setRiskFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<TimelineEventType | ''>('')

  const loadTimeline = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const timeline = await getTimeline(true)
      setEvents(timeline)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timeline')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTimeline()
  }, [loadTimeline, refreshToken])

  const filters: TimelineFilters = useMemo(
    () => ({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      minConfidence: minConfidence ? Number(minConfidence) : undefined,
      entity: entityFilter.trim() || undefined,
      source: sourceFilter.trim() || undefined,
      technology: technologyFilter.trim() || undefined,
      organization: organizationFilter.trim() || undefined,
      risks: riskFilter ? [riskFilter] : undefined,
      types: typeFilter ? [typeFilter] : undefined,
      clusterId: clusterParam || undefined,
    }),
    [
      dateFrom,
      dateTo,
      minConfidence,
      entityFilter,
      sourceFilter,
      technologyFilter,
      organizationFilter,
      riskFilter,
      typeFilter,
      clusterParam,
    ],
  )

  const displayedEvents = useMemo(() => {
    const filtered = filterTimeline(events, filters)
    return searchTimeline(filtered, searchQuery)
  }, [events, filters, searchQuery])

  return (
    <PageContainer
      title="Intelligence Timeline"
      description="Chronological investigation view correlating articles, entities, clusters, briefs, and alerts."
    >
      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Search keyword, entity, company, technology, country…"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </div>

      <div className={styles.filters}>
        <label className={styles.filterField}>
          <span>From</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label className={styles.filterField}>
          <span>To</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <label className={styles.filterField}>
          <span>Risk</span>
          <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
            <option value="">All</option>
            {TIMELINE_RISK_OPTIONS.map((risk) => (
              <option key={risk} value={risk}>{risk}</option>
            ))}
          </select>
        </label>
        <label className={styles.filterField}>
          <span>Min confidence</span>
          <input
            type="number"
            min={0}
            max={100}
            placeholder="0"
            value={minConfidence}
            onChange={(e) => setMinConfidence(e.target.value)}
          />
        </label>
        <label className={styles.filterField}>
          <span>Type</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TimelineEventType | '')}
          >
            <option value="">All</option>
            {TIMELINE_EVENT_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>
        <label className={styles.filterField}>
          <span>Entity</span>
          <input value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} />
        </label>
        <label className={styles.filterField}>
          <span>Source</span>
          <input value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} />
        </label>
        <label className={styles.filterField}>
          <span>Technology</span>
          <input value={technologyFilter} onChange={(e) => setTechnologyFilter(e.target.value)} />
        </label>
        <label className={styles.filterField}>
          <span>Organization</span>
          <input value={organizationFilter} onChange={(e) => setOrganizationFilter(e.target.value)} />
        </label>
      </div>

      {clusterParam && (
        <div className={styles.clusterBanner}>
          Showing events correlated to cluster <code>{clusterParam}</code>
        </div>
      )}

      {isLoading && <div className={styles.stateBox}>Loading intelligence timeline…</div>}

      {error && !isLoading && (
        <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">{error}</div>
      )}

      {!isLoading && !error && displayedEvents.length === 0 && (
        <div className={styles.emptyState}>
          <h3 className={styles.emptyTitle}>No timeline events match your filters</h3>
          <p className={styles.emptyText}>
            Import articles, fuse clusters, generate briefs, or clear filters to see correlated intelligence events.
          </p>
        </div>
      )}

      {!isLoading && !error && displayedEvents.length > 0 && (
        <div className={styles.timeline}>
          <p className={styles.timelineHint}>Newest ↓ Older</p>
          {displayedEvents.map((event) => (
            <TimelineEventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </PageContainer>
  )
}
