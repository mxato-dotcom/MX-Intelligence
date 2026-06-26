import { useCallback, useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { ApiKeyInput } from '@/components/settings/ApiKeyInput'
import {
  ConnectionTestTrigger,
} from '@/components/settings/ConnectionTestButton'
import { ConnectionResultCard } from '@/components/settings/ConnectionResultCard'
import { ConnectorHealthCard } from '@/components/settings/ConnectorHealthCard'
import { ConnectorConfigHeader } from '@/components/settings/ConnectorConfigHeader'
import { CredentialDialog } from '@/components/settings/CredentialDialog'
import { CredentialStatusCard } from '@/components/settings/CredentialStatusCard'
import { SecurityFooter } from '@/components/settings/SecurityFooter'
import { SettingsConnectorDashboard } from '@/components/settings/SettingsConnectorDashboard'
import { SettingsLayout } from '@/components/settings/SettingsLayout'
import { SettingsSection } from '@/components/settings/SettingsSection'
import { useConnectionTest } from '@/components/settings/useConnectionTest'
import shared from '@/components/settings/settingsShared.module.css'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/hooks/useAuth'
import * as credentialService from '@/services/connectorCredentialService'
import { enqueueConnectorSync } from '@/services/connectorSyncService'
import { getEnrichedConnectorHealth } from '@/services/connectorHealthService'
import * as settingsService from '@/services/connectorSettingsService'
import type { ApiKeyProviderId } from '@/types/connectorConfig'
import type {
  ConnectorHealthRecord,
  ConnectorId,
  DuplicateDetectionMode,
  GoogleNewsSettings,
  HackerNewsSettings,
  RssDefaultsSettings,
} from '@/types/connectorSettings'
import { getConnectorProvider } from '@/types/connectorSettings'
import styles from './SettingsPage.module.css'

const NAV_ITEMS = [
  { id: 'newsapi', label: 'NewsAPI', connectorId: 'newsapi' as const },
  { id: 'reddit', label: 'Reddit', connectorId: 'reddit' as const },
  { id: 'google-news', label: 'Google News', connectorId: 'google_news' as const },
  { id: 'hacker-news', label: 'Hacker News', connectorId: 'hacker_news' as const },
  { id: 'rss-defaults', label: 'RSS Defaults', connectorId: 'rss' as const },
  { id: 'connector-status', label: 'Connector Dashboard', isDashboard: true },
]

const REDDIT_PROVIDERS: ApiKeyProviderId[] = [
  'reddit_client_id',
  'reddit_client_secret',
  'reddit_refresh_token',
]

const REDDIT_LABELS: Record<string, string> = {
  reddit_client_id: 'Client ID',
  reddit_client_secret: 'Client Secret',
  reddit_refresh_token: 'Refresh Token',
}

export function SettingsPage() {
  const { showToast } = useToast()
  const { user } = useAuth()
  const [syncingConnector, setSyncingConnector] = useState<string | null>(null)
  const [activeId, setActiveId] = useState('newsapi')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [credentialMap, setCredentialMap] = useState<Record<string, boolean>>({})
  const [newsapiMeta, setNewsapiMeta] = useState<{
    lastTestedAt: string | null
    lastTestError: string | null
    connected: boolean
  }>({ lastTestedAt: null, lastTestError: null, connected: false })
  const [healthRecords, setHealthRecords] = useState<ConnectorHealthRecord[]>([])
  const [googleNews, setGoogleNews] = useState<GoogleNewsSettings>(
    settingsService.DEFAULT_GOOGLE_NEWS_SETTINGS,
  )
  const [hackerNews, setHackerNews] = useState<HackerNewsSettings>(
    settingsService.DEFAULT_HACKER_NEWS_SETTINGS,
  )
  const [rssDefaults, setRssDefaults] = useState<RssDefaultsSettings>(
    settingsService.DEFAULT_RSS_SETTINGS,
  )
  const [secrets, setSecrets] = useState<Record<string, string>>({})
  const [credentialUpdatedAt, setCredentialUpdatedAt] = useState<Record<string, string>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{
    provider: ApiKeyProviderId
    label: string
  } | null>(null)

  const loadAll = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true)
    }
    setError(null)

    try {
      const [statuses, metadata, settings, health] = await Promise.all([
        credentialService.getCredentialStatuses(),
        credentialService.getCredentialMetadata(),
        settingsService.getConnectorSettings(),
        getEnrichedConnectorHealth(),
      ])

      const map: Record<string, boolean> = {}
      for (const row of statuses) {
        map[row.provider] = row.configured
      }
      setCredentialMap(map)
      setNewsapiMeta({
        lastTestedAt: metadata?.newsapi?.lastTestedAt ?? null,
        lastTestError: metadata?.newsapi?.lastTestError ?? null,
        connected: metadata?.newsapi?.connected ?? false,
      })
      setGoogleNews(settings.googleNews)
      setHackerNews(settings.hackerNews)
      setRssDefaults(settings.rss)
      setHealthRecords(health)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      if (!options?.silent) {
        setIsLoading(false)
      }
    }
  }, [])

  const refreshState = useCallback(async () => {
    await loadAll({ silent: true })
  }, [loadAll])

  const handleConnectorSync = useCallback(
    async (connectorId: ConnectorId) => {
      if (!user?.id) {
        showToast('Sign in to sync connectors', 'error')
        return
      }

      setSyncingConnector(connectorId)
      showToast('Syncing connector…')

      try {
        const result = await enqueueConnectorSync(connectorId, user.id)
        if (!result.success) {
          showToast(result.errorMessage ?? 'Sync failed', 'error')
          return
        }
        showToast('Sync queued — check Queue for progress', 'success')
        await refreshState()
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Sync failed', 'error')
      } finally {
        setSyncingConnector(null)
      }
    },
    [user?.id, showToast, refreshState],
  )

  useEffect(() => {
    loadAll()
  }, [loadAll])

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash && NAV_ITEMS.some((item) => item.id === hash)) {
      setActiveId(hash)
    }
  }, [])

  const newsapiTest = useConnectionTest({
    connectorId: 'newsapi',
    connectorName: 'NewsAPI',
    onComplete: refreshState,
  })

  const redditTest = useConnectionTest({
    connectorId: 'reddit',
    connectorName: 'Reddit',
    onComplete: refreshState,
  })

  const googleNewsTest = useConnectionTest({
    connectorId: 'google_news',
    connectorName: 'Google News',
    onComplete: refreshState,
  })

  const hackerNewsTest = useConnectionTest({
    connectorId: 'hacker_news',
    connectorName: 'Hacker News',
    onComplete: refreshState,
  })

  const rssTest = useConnectionTest({
    connectorId: 'rss',
    connectorName: 'RSS',
    onComplete: refreshState,
  })

  const handleNavigate = (id: string) => {
    setActiveId(id)
    window.location.hash = id
  }

  const handleSaveCredential = async (provider: ApiKeyProviderId) => {
    const secret = secrets[provider]?.trim()
    if (!secret) {
      showToast('Enter a value before saving.', 'error')
      return
    }

    setSavingKey(provider)

    try {
      await credentialService.saveCredential(provider, secret)
      const now = new Date().toISOString()
      setSecrets((prev) => ({ ...prev, [provider]: '' }))
      setCredentialMap((prev) => ({ ...prev, [provider]: true }))
      setCredentialUpdatedAt((prev) => ({ ...prev, [provider]: now }))
      showToast(
        provider === 'newsapi' ? 'API key saved successfully' : 'Credential saved successfully',
        'success',
      )
      await refreshState()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save credential', 'error')
    } finally {
      setSavingKey(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return
    }

    setSavingKey(deleteTarget.provider)

    try {
      await credentialService.deleteCredential(deleteTarget.provider)
      setCredentialMap((prev) => ({ ...prev, [deleteTarget.provider]: false }))
      setCredentialUpdatedAt((prev) => {
        const next = { ...prev }
        delete next[deleteTarget.provider]
        return next
      })
      showToast(`${deleteTarget.label} removed`, 'success')
      setDeleteTarget(null)
      await refreshState()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete credential', 'error')
    } finally {
      setSavingKey(null)
    }
  }

  const saveGoogleNews = async () => {
    setSavingSettings(true)
    try {
      const updated = await settingsService.updateGoogleNewsSettings(googleNews)
      setGoogleNews(updated.googleNews)
      showToast('Google News settings saved', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save settings', 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  const saveHackerNews = async () => {
    setSavingSettings(true)
    try {
      const updated = await settingsService.updateHackerNewsSettings(hackerNews)
      setHackerNews(updated.hackerNews)
      showToast('Hacker News settings saved', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save settings', 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  const saveRssDefaults = async () => {
    setSavingSettings(true)
    try {
      const updated = await settingsService.updateRssDefaults(rssDefaults)
      setRssDefaults(updated.rss)
      showToast('RSS defaults saved', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save settings', 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  const newsapiConfigured = credentialMap.newsapi ?? false
  const newsapiHealth = healthRecords.find((h) => h.connectorId === 'newsapi')
  const redditHealth = healthRecords.find((h) => h.connectorId === 'reddit')

  const showDashboardBelow = activeId !== 'connector-status'

  return (
    <PageContainer
      title="Settings"
      description="Configure connector credentials, provider defaults, and monitor connector health. Secrets are never exposed in the browser."
    >
      {error && (
        <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">
          {error}
        </div>
      )}

      <SettingsLayout
        items={NAV_ITEMS}
        activeId={activeId}
        onNavigate={handleNavigate}
        footer={<SecurityFooter />}
      >
        {activeId === 'newsapi' && (
          <div className={styles.mainCard}>
            <ConnectorConfigHeader
              connectorId="newsapi"
              title="NewsAPI"
              description="Store your NewsAPI key securely. The key is only used server-side."
            />
            <div className={styles.configGrid}>
              <CredentialStatusCard
                configured={newsapiConfigured}
                connected={newsapiMeta.connected || newsapiHealth?.connected}
                lastUpdatedAt={credentialUpdatedAt.newsapi}
                isLoading={isLoading}
              />
              <div className={styles.keyColumn}>
                <ApiKeyInput
                  label="API Key"
                  value={secrets.newsapi ?? ''}
                  onChange={(value) => setSecrets((prev) => ({ ...prev, newsapi: value }))}
                  disabled={savingKey === 'newsapi'}
                  hint="Your key is encrypted and never shown after saving."
                />
                <div className={styles.actionRow}>
                  <button
                    type="button"
                    className={shared.button}
                    onClick={() => handleSaveCredential('newsapi')}
                    disabled={savingKey === 'newsapi'}
                  >
                    {savingKey === 'newsapi' ? 'Saving…' : 'Save'}
                  </button>
                  {newsapiConfigured && (
                    <button
                      type="button"
                      className={shared.buttonDanger}
                      onClick={() =>
                        setDeleteTarget({ provider: 'newsapi', label: 'NewsAPI key' })
                      }
                      disabled={savingKey === 'newsapi'}
                    >
                      Delete
                    </button>
                  )}
                  <ConnectionTestTrigger
                    onClick={newsapiTest.test}
                    isTesting={newsapiTest.isTesting}
                    disabled={savingKey === 'newsapi'}
                  />
                </div>
              </div>
            </div>
            <ConnectionResultCard
              status={newsapiTest.status}
              message={newsapiTest.message}
              latencyMs={newsapiTest.latencyMs}
              testedAt={newsapiTest.testedAt}
              isLoading={newsapiTest.isTesting}
              connectorName="NewsAPI"
            />
          </div>
        )}

        {activeId === 'reddit' && (
          <div className={styles.mainCard}>
            <ConnectorConfigHeader
              connectorId="reddit"
              title="Reddit"
              description="Optional OAuth credentials for authenticated Reddit access. Public feeds work without credentials."
            />
            <CredentialStatusCard
              title="Credential Status"
              configured={
                REDDIT_PROVIDERS.some((p) => credentialMap[p]) ||
                redditHealth?.credentialStatus !== 'missing'
              }
              connected={redditHealth?.connected ?? false}
              lastUpdatedAt={
                credentialUpdatedAt.reddit_client_id ??
                credentialUpdatedAt.reddit_client_secret ??
                credentialUpdatedAt.reddit_refresh_token
              }
              isLoading={isLoading}
            />
            {REDDIT_PROVIDERS.map((provider) => {
              const configured = credentialMap[provider] ?? false

              return (
                <div key={provider} className={styles.credentialBlock}>
                  <CredentialStatusCard
                    title={REDDIT_LABELS[provider]}
                    configured={configured}
                    connected={configured}
                    lastUpdatedAt={credentialUpdatedAt[provider]}
                  />
                  <ApiKeyInput
                    label={REDDIT_LABELS[provider]}
                    value={secrets[provider] ?? ''}
                    onChange={(value) => setSecrets((prev) => ({ ...prev, [provider]: value }))}
                    disabled={savingKey === provider}
                  />
                  <div className={styles.actionRow}>
                    <button
                      type="button"
                      className={shared.button}
                      onClick={() => handleSaveCredential(provider)}
                      disabled={savingKey === provider}
                    >
                      {savingKey === provider ? 'Saving…' : 'Save'}
                    </button>
                    {configured && (
                      <button
                        type="button"
                        className={shared.buttonDanger}
                        onClick={() =>
                          setDeleteTarget({
                            provider,
                            label: REDDIT_LABELS[provider],
                          })
                        }
                        disabled={savingKey === provider}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            <div className={styles.actionRow}>
              <ConnectionTestTrigger
                onClick={redditTest.test}
                isTesting={redditTest.isTesting}
              />
            </div>
            <ConnectionResultCard
              status={redditTest.status}
              message={redditTest.message}
              latencyMs={redditTest.latencyMs}
              testedAt={redditTest.testedAt}
              isLoading={redditTest.isTesting}
              connectorName="Reddit"
            />
          </div>
        )}

        {activeId === 'google-news' && (
          <div className={styles.mainCard}>
            <ConnectorConfigHeader
              connectorId="google_news"
              title="Google News"
              description="Default parameters for Google News RSS sources."
            />
            <div className={styles.formSection}>
              <div className={shared.row}>
                <label className={shared.field}>
                  <span className={shared.label}>Language</span>
                  <input
                    className={shared.input}
                    value={googleNews.language}
                    onChange={(e) =>
                      setGoogleNews((prev) => ({ ...prev, language: e.target.value }))
                    }
                  />
                </label>
                <label className={shared.field}>
                  <span className={shared.label}>Country</span>
                  <input
                    className={shared.input}
                    value={googleNews.country}
                    onChange={(e) =>
                      setGoogleNews((prev) => ({ ...prev, country: e.target.value }))
                    }
                  />
                </label>
              </div>
              <label className={shared.field}>
                <span className={shared.label}>Default search query</span>
                <input
                  className={shared.input}
                  value={googleNews.defaultSearchQuery}
                  onChange={(e) =>
                    setGoogleNews((prev) => ({ ...prev, defaultSearchQuery: e.target.value }))
                  }
                />
              </label>
              <div className={shared.row}>
                <label className={shared.field}>
                  <span className={shared.label}>Maximum articles</span>
                  <input
                    className={shared.input}
                    type="number"
                    min={1}
                    max={100}
                    value={googleNews.maxArticles}
                    onChange={(e) =>
                      setGoogleNews((prev) => ({
                        ...prev,
                        maxArticles: Number(e.target.value),
                      }))
                    }
                  />
                </label>
                <label className={shared.field}>
                  <span className={shared.label}>Refresh interval</span>
                  <input
                    className={shared.input}
                    value={googleNews.refreshInterval}
                    onChange={(e) =>
                      setGoogleNews((prev) => ({ ...prev, refreshInterval: e.target.value }))
                    }
                    placeholder="24h"
                  />
                </label>
              </div>
              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={shared.button}
                  onClick={saveGoogleNews}
                  disabled={savingSettings}
                >
                  {savingSettings ? 'Saving…' : 'Save settings'}
                </button>
                <ConnectionTestTrigger
                  onClick={googleNewsTest.test}
                  isTesting={googleNewsTest.isTesting}
                />
              </div>
              <ConnectionResultCard
                status={googleNewsTest.status}
                message={googleNewsTest.message}
                latencyMs={googleNewsTest.latencyMs}
                testedAt={googleNewsTest.testedAt}
                isLoading={googleNewsTest.isTesting}
                connectorName="Google News"
              />
            </div>
          </div>
        )}

        {activeId === 'hacker-news' && (
          <div className={styles.mainCard}>
            <ConnectorConfigHeader
              connectorId="hacker_news"
              title="Hacker News"
              description="Default feed and sync limits for Hacker News sources."
            />
            <div className={styles.formSection}>
              <div className={shared.row}>
                <label className={shared.field}>
                  <span className={shared.label}>Category</span>
                  <select
                    className={shared.select}
                    value={hackerNews.category}
                    onChange={(e) =>
                      setHackerNews((prev) => ({
                        ...prev,
                        category: e.target.value as HackerNewsSettings['category'],
                      }))
                    }
                  >
                    <option value="top">Top</option>
                    <option value="best">Best</option>
                    <option value="new">New</option>
                    <option value="ask">Ask HN</option>
                    <option value="show">Show HN</option>
                    <option value="jobs">Job</option>
                  </select>
                </label>
                <label className={shared.field}>
                  <span className={shared.label}>Maximum stories</span>
                  <input
                    className={shared.input}
                    type="number"
                    min={1}
                    max={100}
                    value={hackerNews.maxStories}
                    onChange={(e) =>
                      setHackerNews((prev) => ({
                        ...prev,
                        maxStories: Number(e.target.value),
                      }))
                    }
                  />
                </label>
              </div>
              <label className={shared.field}>
                <span className={shared.label}>Refresh interval</span>
                <input
                  className={shared.input}
                  value={hackerNews.refreshInterval}
                  onChange={(e) =>
                    setHackerNews((prev) => ({ ...prev, refreshInterval: e.target.value }))
                  }
                  placeholder="6h"
                />
              </label>
              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={shared.button}
                  onClick={saveHackerNews}
                  disabled={savingSettings}
                >
                  {savingSettings ? 'Saving…' : 'Save settings'}
                </button>
                <ConnectionTestTrigger
                  onClick={hackerNewsTest.test}
                  isTesting={hackerNewsTest.isTesting}
                />
              </div>
              <ConnectionResultCard
                status={hackerNewsTest.status}
                message={hackerNewsTest.message}
                latencyMs={hackerNewsTest.latencyMs}
                testedAt={hackerNewsTest.testedAt}
                isLoading={hackerNewsTest.isTesting}
                connectorName="Hacker News"
              />
            </div>
          </div>
        )}

        {activeId === 'rss-defaults' && (
          <div className={styles.mainCard}>
            <ConnectorConfigHeader
              connectorId="rss"
              title="RSS Defaults"
              description="Default values applied when creating new RSS sources."
            />
            <div className={styles.formSection}>
              <div className={shared.row}>
                <label className={shared.field}>
                  <span className={shared.label}>Default refresh interval</span>
                  <input
                    className={shared.input}
                    value={rssDefaults.defaultRefreshInterval}
                    onChange={(e) =>
                      setRssDefaults((prev) => ({
                        ...prev,
                        defaultRefreshInterval: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className={shared.field}>
                  <span className={shared.label}>Max articles per sync</span>
                  <input
                    className={shared.input}
                    type="number"
                    min={1}
                    max={200}
                    value={rssDefaults.maxArticlesPerSync}
                    onChange={(e) =>
                      setRssDefaults((prev) => ({
                        ...prev,
                        maxArticlesPerSync: Number(e.target.value),
                      }))
                    }
                  />
                </label>
              </div>
              <div className={shared.row}>
                <label className={shared.field}>
                  <span className={shared.label}>Duplicate detection mode</span>
                  <select
                    className={shared.select}
                    value={rssDefaults.duplicateDetectionMode}
                    onChange={(e) =>
                      setRssDefaults((prev) => ({
                        ...prev,
                        duplicateDetectionMode: e.target.value as DuplicateDetectionMode,
                      }))
                    }
                  >
                    <option value="strict">Strict</option>
                    <option value="normal">Normal</option>
                    <option value="lenient">Lenient</option>
                  </select>
                </label>
                <label className={shared.field}>
                  <span className={shared.label}>Trust score default</span>
                  <input
                    className={shared.input}
                    type="number"
                    min={0}
                    max={100}
                    value={rssDefaults.trustScoreDefault}
                    onChange={(e) =>
                      setRssDefaults((prev) => ({
                        ...prev,
                        trustScoreDefault: Number(e.target.value),
                      }))
                    }
                  />
                </label>
              </div>
              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={shared.button}
                  onClick={saveRssDefaults}
                  disabled={savingSettings}
                >
                  {savingSettings ? 'Saving…' : 'Save defaults'}
                </button>
                <ConnectionTestTrigger onClick={rssTest.test} isTesting={rssTest.isTesting} />
              </div>
              <ConnectionResultCard
                status={rssTest.status}
                message={rssTest.message}
                latencyMs={rssTest.latencyMs}
                testedAt={rssTest.testedAt}
                isLoading={rssTest.isTesting}
                connectorName="RSS"
              />
            </div>
          </div>
        )}

        {activeId === 'connector-status' && (
          <SettingsSection
            id="connector-status"
            title="Connector Dashboard"
            description="Monitor connection health, sync history, and import volume for every connector."
            isLoading={isLoading}
          >
            <div className={styles.statusGrid}>
              {healthRecords.map((health) => (
                <ConnectorHealthCard
                  key={health.connectorId}
                  health={health}
                  compact
                  onConfigure={() =>
                    handleNavigate(getConnectorProvider(health.connectorId).settingsPath)
                  }
                  onTestComplete={refreshState}
                  onSyncNow={() => handleConnectorSync(health.connectorId)}
                  isSyncing={syncingConnector === health.connectorId}
                />
              ))}
            </div>
          </SettingsSection>
        )}

        {showDashboardBelow && (
          <SettingsConnectorDashboard
            healthRecords={healthRecords}
            isLoading={isLoading}
            onConfigure={handleNavigate}
            onTestComplete={refreshState}
            onRefresh={() => loadAll({ silent: true })}
            onSyncNow={handleConnectorSync}
            syncingConnector={syncingConnector}
          />
        )}
      </SettingsLayout>

      <CredentialDialog
        open={deleteTarget !== null}
        title="Delete credential"
        message={`Remove ${deleteTarget?.label ?? 'credential'}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isProcessing={savingKey !== null}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageContainer>
  )
}
