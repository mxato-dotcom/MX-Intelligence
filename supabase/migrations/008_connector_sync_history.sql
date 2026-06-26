-- Connector sync execution history, structured logs, and connector health (Phase 10C)
-- Idempotent: safe to run multiple times.

-- -----------------------------------------------------------------------------
-- user_connector_health (create if missing; extend if present from 007)
-- -----------------------------------------------------------------------------
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
  health_score integer,
  success_rate numeric(5, 2),
  remaining_quota text,
  last_http_status integer,
  total_syncs integer NOT NULL DEFAULT 0,
  failed_syncs integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, connector_id)
);

ALTER TABLE user_connector_health ADD COLUMN IF NOT EXISTS health_score integer;
ALTER TABLE user_connector_health ADD COLUMN IF NOT EXISTS success_rate numeric(5, 2);
ALTER TABLE user_connector_health ADD COLUMN IF NOT EXISTS remaining_quota text;
ALTER TABLE user_connector_health ADD COLUMN IF NOT EXISTS last_http_status integer;
ALTER TABLE user_connector_health ADD COLUMN IF NOT EXISTS total_syncs integer NOT NULL DEFAULT 0;
ALTER TABLE user_connector_health ADD COLUMN IF NOT EXISTS failed_syncs integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_user_connector_health_user_id
  ON user_connector_health(user_id);

-- -----------------------------------------------------------------------------
-- connector_sync_history
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS connector_sync_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connector_id text NOT NULL,
  source_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer,
  status text NOT NULL DEFAULT 'running',
  articles_downloaded integer NOT NULL DEFAULT 0,
  articles_imported integer NOT NULL DEFAULT 0,
  duplicates integer NOT NULL DEFAULT 0,
  errors integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  http_status integer,
  remaining_quota text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connector_sync_history_user_started
  ON connector_sync_history(user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_connector_sync_history_connector
  ON connector_sync_history(user_id, connector_id, started_at DESC);

-- -----------------------------------------------------------------------------
-- connector_sync_logs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS connector_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_id uuid REFERENCES connector_sync_history(id) ON DELETE CASCADE,
  connector_id text NOT NULL,
  request_at timestamptz NOT NULL DEFAULT now(),
  response_at timestamptz,
  duration_ms integer,
  http_status integer,
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  remaining_quota text,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connector_sync_logs_user
  ON connector_sync_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_connector_sync_logs_sync_id
  ON connector_sync_logs(sync_id);

-- -----------------------------------------------------------------------------
-- articles.metadata (provider evidence)
-- -----------------------------------------------------------------------------
ALTER TABLE articles ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- -----------------------------------------------------------------------------
-- Row Level Security (enable after tables exist)
-- -----------------------------------------------------------------------------
ALTER TABLE user_connector_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE connector_sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE connector_sync_logs ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- RLS policies (drop + recreate for idempotency)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS user_connector_health_select ON user_connector_health;
CREATE POLICY user_connector_health_select ON user_connector_health
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_connector_health_insert ON user_connector_health;
CREATE POLICY user_connector_health_insert ON user_connector_health
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_connector_health_update ON user_connector_health;
CREATE POLICY user_connector_health_update ON user_connector_health
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS connector_sync_history_select ON connector_sync_history;
CREATE POLICY connector_sync_history_select ON connector_sync_history
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS connector_sync_history_insert ON connector_sync_history;
CREATE POLICY connector_sync_history_insert ON connector_sync_history
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS connector_sync_history_update ON connector_sync_history;
CREATE POLICY connector_sync_history_update ON connector_sync_history
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS connector_sync_logs_select ON connector_sync_logs;
CREATE POLICY connector_sync_logs_select ON connector_sync_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS connector_sync_logs_insert ON connector_sync_logs;
CREATE POLICY connector_sync_logs_insert ON connector_sync_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
