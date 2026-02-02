-- Ajouter le type facebook à la contrainte de type
ALTER TABLE public.sources_media DROP CONSTRAINT IF EXISTS sources_media_type_check;
ALTER TABLE public.sources_media ADD CONSTRAINT sources_media_type_check 
  CHECK (type = ANY (ARRAY['web', 'rss', 'twitter', 'linkedin', 'facebook', 'autre', 'institution', 'presse', 'bailleur', 'industrie', 'international']));

-- Ajouter les sources de réseaux sociaux
INSERT INTO public.sources_media (nom, type, url, actif, frequence_scan)
VALUES 
  ('LinkedIn ANSUT', 'linkedin', 'https://www.linkedin.com/company/ansut', true, 'quotidien'),
  ('Twitter/X ANSUT', 'twitter', 'https://twitter.com/ansut_ci', true, 'quotidien'),
  ('Facebook ANSUT', 'facebook', 'https://www.facebook.com/ansut.ci', true, 'quotidien')
ON CONFLICT DO NOTHING;

-- Table pour stocker les insights sociaux spécifiquement
CREATE TABLE IF NOT EXISTS public.social_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES public.sources_media(id) ON DELETE CASCADE,
  plateforme TEXT NOT NULL CHECK (plateforme IN ('linkedin', 'twitter', 'facebook')),
  type_contenu TEXT NOT NULL DEFAULT 'post' CHECK (type_contenu IN ('post', 'mention', 'hashtag', 'trending')),
  contenu TEXT,
  auteur TEXT,
  auteur_url TEXT,
  url_original TEXT,
  date_publication TIMESTAMPTZ,
  engagement_score INTEGER DEFAULT 0,
  sentiment NUMERIC(3,2),
  entites_detectees TEXT[],
  hashtags TEXT[],
  est_critique BOOLEAN DEFAULT false,
  traite BOOLEAN DEFAULT false,
  alerte_generee BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_social_insights_plateforme ON public.social_insights(plateforme);
CREATE INDEX IF NOT EXISTS idx_social_insights_created_at ON public.social_insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_insights_est_critique ON public.social_insights(est_critique) WHERE est_critique = true;

-- Activer RLS
ALTER TABLE public.social_insights ENABLE ROW LEVEL SECURITY;

-- Politique de lecture pour tous les utilisateurs authentifiés
CREATE POLICY "Authenticated users can view social insights"
ON public.social_insights
FOR SELECT
TO authenticated
USING (true);

-- Politique d'insertion pour les fonctions de service
CREATE POLICY "Service role can insert social insights"
ON public.social_insights
FOR INSERT
TO service_role
WITH CHECK (true);

-- Politique de mise à jour pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can update social insights"
ON public.social_insights
FOR UPDATE
TO authenticated
USING (true);

-- Ajouter les seuils d'alerte pour les réseaux sociaux dans config_seuils
INSERT INTO public.config_seuils (cle, valeur, description)
VALUES 
  ('seuil_alerte_social', '{"importance_min": 40, "engagement_min": 100, "sentiment_critique": -0.5}'::jsonb, 'Seuils de déclenchement des alertes pour les sources de réseaux sociaux (plus bas que les sources classiques)')
ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur;

-- Activer realtime pour les insights sociaux
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_insights;