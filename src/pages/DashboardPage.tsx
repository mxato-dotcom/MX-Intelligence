import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useDashboard } from '@/hooks/useDashboard'
import { articleDetailPath, videoDetailPath, ROUTES } from '@/lib/constants'
import { formatDate } from '@/lib/format'
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

  const { stats, latestArticles, latestVideos, dailyBrief, highlightsText } = data
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
                  <h4 className={styles.itemTitle}>{article.title}</h4>
                  <div className={styles.itemMeta}>
                    <span className={styles.badge}>{article.category}</span>
                    <span className={styles.badge}>{article.source}</span>
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
                    <h4 className={styles.itemTitle}>{video.title}</h4>
                    <div className={styles.itemMeta}>
                      <span className={styles.badge}>{video.category}</span>
                      <span className={styles.badge}>{video.source}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Daily Highlights</h3>
        <div className={styles.highlights}>
          {dailyBrief?.title && (
            <p className={styles.highlightsBriefTitle}>{dailyBrief.title}</p>
          )}
          <p className={styles.highlightsText}>{highlightsText}</p>
          {dailyBrief && (
            <time className={styles.highlightsDate} dateTime={dailyBrief.created_at}>
              {formatDate(dailyBrief.created_at)}
            </time>
          )}
        </div>
      </section>
    </div>
  )
}
