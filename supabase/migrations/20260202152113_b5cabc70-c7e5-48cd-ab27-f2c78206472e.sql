-- Ajouter les identifiants de plateforme à sources_media
ALTER TABLE sources_media 
  ADD COLUMN IF NOT EXISTS platform_id TEXT,
  ADD COLUMN IF NOT EXISTS platform_config JSONB DEFAULT '{}';

-- Table de configuration des APIs sociales
CREATE TABLE IF NOT EXISTS social_api_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plateforme TEXT NOT NULL UNIQUE CHECK (plateforme IN ('twitter', 'linkedin', 'facebook')),
  enabled BOOLEAN DEFAULT false,
  last_sync TIMESTAMPTZ,
  quota_used INTEGER DEFAULT 0,
  quota_limit INTEGER,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enrichir social_insights avec les metriques natives
ALTER TABLE social_insights
  ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_post_id TEXT,
  ADD COLUMN IF NOT EXISTS is_official_api BOOLEAN DEFAULT false;

-- RLS pour social_api_config (admin only)
ALTER TABLE social_api_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage social API config"
ON social_api_config
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Insérer les configurations par défaut
INSERT INTO social_api_config (plateforme, enabled, quota_limit) VALUES
  ('twitter', false, 10000),
  ('linkedin', false, 1000),
  ('facebook', false, 5000)
ON CONFLICT (plateforme) DO NOTHING;

-- Trigger pour updated_at
CREATE TRIGGER update_social_api_config_updated_at
  BEFORE UPDATE ON social_api_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();