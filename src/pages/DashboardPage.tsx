import { FusionClusterCard } from '@/components/fusion/FusionClusterCard'
import { DailyBriefCard } from '@/components/dashboard/DailyBriefCard'
import { TimelineDashboardCard } from '@/components/dashboard/TimelineDashboardCard'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useDashboard } from '@/hooks/useDashboard'
import { articleDetailPath, videoDetailPath, ROUTES } from '@/lib/constants'
import { safeStringOr } from '@/lib/safeString'
import styles from './DashboardPage.module.css'

export function DashboardPage() {
  const { user } = useAuth()
  const { data, isLoading, error } = useDashboard()

  if (isLoading) {
    return <div className={styles.stateBox}>Loading your daily brief…</div>
  }

  if (error) {
    return (
      <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">
        {error}
      </div>
    )
  }

  if (!data) {
    return null
  }

  const {
    stats,
    trustStats,
    fusionStats,
    entityStats,
    topClusters,
    latestArticles,
    latestVideos,
    intelligenceBrief,
    recentTimelineEvents,
  } = data
  const email = user?.email ?? 'there'

  return (
    <div className={styles.dashboard}>
      <header className={styles.welcome}>
        <h2 className={styles.welcomeTitle}>Welcome back</h2>
        <p className={styles.welcomeSubtitle}>
          Your intelligence brief for today — signed in as {email}
        </p>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total Articles</p>
          <p className={styles.statValue}>{stats.totalArticles}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total Videos</p>
          <p className={styles.statValue}>{stats.totalVideos}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total Briefs</p>
          <p className={styles.statValue}>{stats.totalBriefs}</p>
        </div>
      </div>

      <div className={styles.trustStatsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Average Trust</p>
          <p className={styles.statValue}>{trustStats.averageTrust}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Highest Trust Source</p>
          <p className={styles.statValueSmall}>
            {trustStats.highestTrustSource ?? '—'}
          </p>
          {trustStats.highestTrustSource && (
            <p className={styles.statSubvalue}>{trustStats.highestTrustScore}</p>
          )}
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Lowest Trust Source</p>
          <p className={styles.statValueSmall}>
            {trustStats.lowestTrustSource ?? '—'}
          </p>
          {trustStats.lowestTrustSource && (
            <p className={styles.statSubvalue}>{trustStats.lowestTrustScore}</p>
          )}
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Healthy Sources</p>
          <p className={styles.statValue}>{trustStats.healthySources}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Warning Sources</p>
          <p className={styles.statValue}>{trustStats.warningSources}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Offline Sources</p>
          <p className={styles.statValue}>{trustStats.offlineSources}</p>
        </div>
      </div>

      <div className={styles.fusionStatsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total Clusters</p>
          <p className={styles.statValue}>{fusionStats.totalClusters}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Intelligence Clusters</p>
          <p className={styles.statValue}>{fusionStats.intelligenceClusters}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Confirmed Events</p>
          <p className={styles.statValue}>{fusionStats.confirmedEvents}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Single-source Events</p>
          <p className={styles.statValue}>{fusionStats.singleSourceEvents}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Conflicting Reports</p>
          <p className={styles.statValue}>{fusionStats.conflictingReports}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Average Confidence</p>
          <p className={styles.statValue}>{fusionStats.averageConfidence}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Top Intelligence Cluster</p>
          <p className={styles.statValueSmall}>
            {fusionStats.topClusterTitle ?? '—'}
          </p>
          {fusionStats.topClusterTitle && (
            <p className={styles.statSubvalue}>{fusionStats.topClusterConfidence}%</p>
          )}
        </div>
      </div>

      <div className={styles.entityStatsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total Entities</p>
          <p className={styles.statValue}>{entityStats.totalEntities}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Top Organizations</p>
          <p className={styles.statValueSmall}>
            {entityStats.topOrganizations[0]?.normalizedText ?? '—'}
          </p>
          {entityStats.topOrganizations[0] && (
            <p className={styles.statSubvalue}>{entityStats.topOrganizations[0].count} mentions</p>
          )}
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Top Companies</p>
          <p className={styles.statValueSmall}>
            {entityStats.topCompanies[0]?.normalizedText ?? '—'}
          </p>
          {entityStats.topCompanies[0] && (
            <p className={styles.statSubvalue}>{entityStats.topCompanies[0].count} mentions</p>
          )}
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Top Countries</p>
          <p className={styles.statValueSmall}>
            {entityStats.topCountries[0]?.normalizedText ?? '—'}
          </p>
          {entityStats.topCountries[0] && (
            <p className={styles.statSubvalue}>{entityStats.topCountries[0].count} mentions</p>
          )}
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Top Technologies</p>
          <p className={styles.statValueSmall}>
            {entityStats.topTechnologies[0]?.normalizedText ?? '—'}
          </p>
          {entityStats.topTechnologies[0] && (
            <p className={styles.statSubvalue}>{entityStats.topTechnologies[0].count} mentions</p>
          )}
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Top Keywords</p>
          <p className={styles.statValueSmall}>
            {entityStats.topKeywords[0]?.normalizedText ?? '—'}
          </p>
          {entityStats.topKeywords[0] && (
            <p className={styles.statSubvalue}>{entityStats.topKeywords[0].count} mentions</p>
          )}
        </div>
      </div>

      {topClusters.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Intelligence Clusters</h3>
            <Link to={ROUTES.ARTICLES} className={styles.sectionLink}>View articles</Link>
          </div>
          <div className={styles.clusterList}>
            {topClusters.map((cluster) => (
              <FusionClusterCard key={cluster.id} cluster={cluster} />
            ))}
          </div>
        </section>
      )}

      <DailyBriefCard brief={intelligenceBrief} />

      <TimelineDashboardCard events={recentTimelineEvents} />

      <div className={styles.contentGrid}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Latest Articles</h3>
            <Link to={ROUTES.ARTICLES} className={styles.sectionLink}>View all</Link>
          </div>

          {latestArticles.length === 0 ? (
            <div className={styles.emptySection}>
              No articles yet. <Link to={ROUTES.ARTICLES_NEW}>Add an article</Link>.
            </div>
          ) : (
            <div className={styles.articleList}>
              {latestArticles.map((article) => (
                <Link
                  key={article.id}
                  to={articleDetailPath(article.id)}
                  className={styles.articleItem}
                >
                  <h4 className={styles.itemTitle}>{safeStringOr(article.title, 'Untitled')}</h4>
                  <div className={styles.itemMeta}>
                    <span className={styles.badge}>{safeStringOr(article.category, 'Uncategorized')}</span>
                    <span className={styles.badge}>{safeStringOr(article.source, 'Unknown source')}</span>
                  </div>
                  {article.summary && (
                    <p className={styles.itemSummary}>{article.summary}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Latest Videos</h3>
            <Link to={ROUTES.VIDEOS} className={styles.sectionLink}>View all</Link>
          </div>

          {latestVideos.length === 0 ? (
            <div className={styles.emptySection}>
              No videos yet. <Link to={ROUTES.VIDEOS_NEW}>Add a video</Link>.
            </div>
          ) : (
            <div className={styles.videoList}>
              {latestVideos.map((video) => (
                <Link
                  key={video.id}
                  to={videoDetailPath(video.id)}
                  className={styles.videoItem}
                >
                  <div className={styles.videoThumbWrap}>
                    {video.thumbnail_url ? (
                      <img
                        className={styles.videoThumb}
                        src={video.thumbnail_url}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <div className={styles.videoThumbPlaceholder}>No image</div>
                    )}
                  </div>
                  <div className={styles.videoBody}>
                    <h4 className={styles.itemTitle}>{safeStringOr(video.title, 'Untitled')}</h4>
                    <div className={styles.itemMeta}>
                      <span className={styles.badge}>{safeStringOr(video.category, 'Uncategorized')}</span>
                      <span className={styles.badge}>{safeStringOr(video.source, 'Unknown source')}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
