-- Table des métriques de présence digitale (historique journalier)
CREATE TABLE public.presence_digitale_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personnalite_id UUID NOT NULL REFERENCES public.personnalites(id) ON DELETE CASCADE,
  date_mesure DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Axe A: Visibilité médiatique (30%)
  nb_mentions INTEGER DEFAULT 0,
  nb_sources_distinctes INTEGER DEFAULT 0,
  regularite_mentions DECIMAL(3,2) DEFAULT 0,
  score_visibilite DECIMAL(5,2) DEFAULT 0,
  
  -- Axe B: Qualité & Tonalité (25%)
  sentiment_moyen DECIMAL(3,2) DEFAULT 0,
  pct_themes_strategiques DECIMAL(3,2) DEFAULT 0,
  nb_controverses INTEGER DEFAULT 0,
  score_qualite DECIMAL(5,2) DEFAULT 0,
  
  -- Axe C: Autorité institutionnelle (25%)
  nb_citations_directes INTEGER DEFAULT 0,
  nb_invitations_panels INTEGER DEFAULT 0,
  nb_references_croisees INTEGER DEFAULT 0,
  score_autorite DECIMAL(5,2) DEFAULT 0,
  
  -- Axe D: Présence numérique directe (20%)
  activite_linkedin INTEGER DEFAULT 0,
  engagement_linkedin DECIMAL(5,2) DEFAULT 0,
  coherence_message DECIMAL(3,2) DEFAULT 0,
  score_presence DECIMAL(5,2) DEFAULT 0,
  
  -- Score final composite
  score_spdi DECIMAL(5,2) DEFAULT 0,
  interpretation TEXT DEFAULT 'visibilite_faible',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(personnalite_id, date_mesure)
);

-- Table des recommandations IA générées
CREATE TABLE public.presence_digitale_recommandations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personnalite_id UUID NOT NULL REFERENCES public.personnalites(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('opportunite', 'alerte', 'canal', 'thematique')),
  priorite TEXT DEFAULT 'normale' CHECK (priorite IN ('haute', 'normale', 'basse')),
  titre TEXT NOT NULL,
  message TEXT NOT NULL,
  thematique TEXT,
  canal TEXT CHECK (canal IN ('linkedin', 'presse', 'conference', 'communique')),
  actif BOOLEAN DEFAULT true,
  vue BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  expire_at TIMESTAMPTZ
);

-- Extension de la table personnalites pour SPDI
ALTER TABLE public.personnalites
  ADD COLUMN IF NOT EXISTS suivi_spdi_actif BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS score_spdi_actuel DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tendance_spdi TEXT DEFAULT 'stable',
  ADD COLUMN IF NOT EXISTS derniere_mesure_spdi TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE public.presence_digitale_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presence_digitale_recommandations ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour presence_digitale_metrics
CREATE POLICY "Authenticated users can view metrics"
  ON public.presence_digitale_metrics
  FOR SELECT
  USING (true);

CREATE POLICY "System can manage metrics"
  ON public.presence_digitale_metrics
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies pour presence_digitale_recommandations
CREATE POLICY "Authenticated users can view recommandations"
  ON public.presence_digitale_recommandations
  FOR SELECT
  USING (true);

CREATE POLICY "System can manage recommandations"
  ON public.presence_digitale_recommandations
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can mark recommandations as viewed"
  ON public.presence_digitale_recommandations
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_metrics_personnalite_date ON public.presence_digitale_metrics(personnalite_id, date_mesure DESC);
CREATE INDEX idx_recommandations_personnalite_actif ON public.presence_digitale_recommandations(personnalite_id, actif) WHERE actif = true;