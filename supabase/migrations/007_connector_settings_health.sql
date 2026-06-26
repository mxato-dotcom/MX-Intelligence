-- Non-secret per-user connector preferences (language, defaults, RSS options)
CREATE TABLE IF NOT EXISTS user_connector_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_connector_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_connector_settings_select ON user_connector_settings
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY user_connector_settings_insert ON user_connector_settings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_connector_settings_update ON user_connector_settings
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Connector health metadata (no secrets; writes via Edge Functions)
CREATE TABLE IF NOT EXISTS user_connector_health (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connector_id text NOT NULL,
  connected boolean NOT NULL DEFAULT false,
  credential_status text NOT NULL DEFAULT 'missing',
  last_tested_at timestamptz,
  last_test_status text,
  last_test_error text,
  last_sync_at timestamptz,
  last_successful_sync_at timestamptz,
  last_failure_at timestamptz,
  last_failure_error text,
  articles_imported integer NOT NULL DEFAULT 0,
  average_sync_time_ms integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, connector_id)
);

CREATE INDEX IF NOT EXISTS idx_user_connector_health_user_id ON user_connector_health(user_id);

ALTER TABLE user_connector_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_connector_health_select ON user_connector_health
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
