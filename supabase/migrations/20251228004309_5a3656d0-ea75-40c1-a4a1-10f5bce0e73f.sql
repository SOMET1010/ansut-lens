-- =============================================
-- PHASE 1.1 : Table collectes_log
-- =============================================
CREATE TABLE public.collectes_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('critique', 'quotidienne', 'hebdomadaire', 'manuelle')),
  statut TEXT NOT NULL CHECK (statut IN ('success', 'error', 'partial')),
  nb_resultats INTEGER DEFAULT 0,
  mots_cles_utilises TEXT[] DEFAULT '{}',
  duree_ms INTEGER,
  erreur TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_collectes_log_created_at ON public.collectes_log(created_at DESC);
CREATE INDEX idx_collectes_log_type ON public.collectes_log(type);

-- Enable RLS
ALTER TABLE public.collectes_log ENABLE ROW LEVEL SECURITY;

-- Admins can manage all logs
CREATE POLICY "Admins can manage collectes_log"
ON public.collectes_log
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can view logs
CREATE POLICY "Authenticated users can view collectes_log"
ON public.collectes_log
FOR SELECT
USING (true);

-- System can insert logs (for edge functions)
CREATE POLICY "System can insert collectes_log"
ON public.collectes_log
FOR INSERT
WITH CHECK (true);

-- =============================================
-- PHASE 1.3 : Activer pg_cron et pg_net
-- =============================================
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;