-- Ajouter la colonne source_type à actualites pour tracer l'origine (perplexity, grok_twitter, manual)
ALTER TABLE actualites 
ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'perplexity';

COMMENT ON COLUMN actualites.source_type IS 'Source de collecte: perplexity, grok_twitter, manual';

-- Ajouter la colonne sources_utilisees à collectes_log pour tracer les sources utilisées
ALTER TABLE collectes_log 
ADD COLUMN IF NOT EXISTS sources_utilisees text[] DEFAULT ARRAY['perplexity'];