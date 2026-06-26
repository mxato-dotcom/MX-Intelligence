-- API keys (secrets read only via Edge Functions with service role)
CREATE TABLE IF NOT EXISTS user_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  secret text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);

ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Users may write their own keys but cannot read secrets from the client
CREATE POLICY user_api_keys_insert ON user_api_keys
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_api_keys_update ON user_api_keys
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_api_keys_delete ON user_api_keys
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Connector-specific source configuration
ALTER TABLE sources ADD COLUMN IF NOT EXISTS connector_config jsonb NOT NULL DEFAULT '{}'::jsonb;
