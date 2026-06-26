import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageContainer } from '@/components/layout/PageContainer'
import { EntityProfileHeader } from '@/components/entityProfile/EntityProfileHeader'
import { EntityProfileSummary } from '@/components/entityProfile/EntityProfileStats'
import { EntityProfileStats } from '@/components/entityProfile/EntityProfileStats'
import { useDataRefresh } from '@/contexts/DataRefreshContext'
import { ROUTES } from '@/lib/constants'
import { getEntityIntelligenceProfile } from '@/services/entityProfileService'
import type { EntityIntelligenceProfile } from '@/types/entityProfile'
import styles from './EntityProfilePage.module.css'

const LazyEntityProfileTimeline = lazy(() =>
  import('@/components/entityProfile/EntityProfileTimeline').then((module) => ({
    default: module.EntityProfileTimeline,
  })),
)

const LazyEntityProfileArticles = lazy(() =>
  import('@/components/entityProfile/EntityProfileSections').then((module) => ({
    default: module.EntityProfileArticles,
  })),
)

const LazyEntityProfileRelatedEntities = lazy(() =>
  import('@/components/entityProfile/EntityProfileSections').then((module) => ({
    default: module.EntityProfileRelatedEntities,
  })),
)

const LazyEntityProfileClusters = lazy(() =>
  import('@/components/entityProfile/EntityProfileSections').then((module) => ({
    default: module.EntityProfileClusters,
  })),
)

const LazyEntityProfileSimilar = lazy(() =>
  import('@/components/entityProfile/EntityProfileSections').then((module) => ({
    default: module.EntityProfileSimilar,
  })),
)

const LazyEntityProfileGraphSection = lazy(() =>
  import('@/components/entityProfile/EntityProfileGraphSection').then((module) => ({
    default: module.EntityProfileGraphSection,
  })),
)

function SectionFallback() {
  return <div className={styles.sectionLoading}>Loading section…</div>
}

export function EntityProfilePage() {
  const { entityId: rawEntityId = '' } = useParams<{ entityId: string }>()
  const { refreshToken } = useDataRefresh()
  const [profile, setProfile] = useState<EntityIntelligenceProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    if (!rawEntityId) {
      setProfile(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await getEntityIntelligenceProfile(rawEntityId, true)
      setProfile(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entity profile')
    } finally {
      setIsLoading(false)
    }
  }, [rawEntityId])

  useEffect(() => {
    loadProfile()
  }, [loadProfile, refreshToken])

  if (isLoading) {
    return (
      <PageContainer title="Entity Intelligence Profile" description="Loading intelligence profile…">
        <div className={styles.stateBox}>Loading entity intelligence profile…</div>
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer title="Entity Intelligence Profile" description="Entity investigation profile">
        <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">{error}</div>
      </PageContainer>
    )
  }

  if (!profile) {
    return (
      <PageContainer title="Entity Intelligence Profile" description="Entity investigation profile">
        <div className={styles.stateBox}>
          Entity not found. Return to the <Link to={ROUTES.ENTITIES}>Entities</Link> page.
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer
      title={profile.displayText}
      description={`${profile.entityType} intelligence profile`}
    >
      <EntityProfileHeader profile={profile} />
      <EntityProfileStats stats={profile.stats} />
      <EntityProfileSummary summary={profile.summary} />

      <Suspense fallback={<SectionFallback />}>
        <LazyEntityProfileTimeline events={profile.timelineEvents} />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <LazyEntityProfileArticles articles={profile.relatedArticles} />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <LazyEntityProfileRelatedEntities entities={profile.relatedEntities} />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <LazyEntityProfileClusters clusters={profile.relatedClusters} />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <LazyEntityProfileSimilar entities={profile.similarEntities} />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <LazyEntityProfileGraphSection
          graphData={profile.graphData}
          centerNodeId={profile.graphCenterNodeId}
        />
      </Suspense>
    </PageContainer>
  )
}
