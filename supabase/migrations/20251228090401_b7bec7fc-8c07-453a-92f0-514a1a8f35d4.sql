-- Extension de la table personnalites avec les nouveaux champs pour l'architecture acteurs clés
ALTER TABLE personnalites 
  ADD COLUMN IF NOT EXISTS cercle INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS sous_categorie TEXT,
  ADD COLUMN IF NOT EXISTS pays TEXT DEFAULT 'Côte d''Ivoire',
  ADD COLUMN IF NOT EXISTS zone TEXT DEFAULT 'Afrique de l''Ouest',
  ADD COLUMN IF NOT EXISTS thematiques TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sources_suivies JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS alertes_config JSONB DEFAULT '{"changement_position": true, "annonce_majeure": true, "polemique": true, "financement": true}',
  ADD COLUMN IF NOT EXISTS niveau_alerte TEXT DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT true;

-- Contrainte pour le cercle (1-4)
ALTER TABLE personnalites ADD CONSTRAINT personnalites_cercle_check CHECK (cercle BETWEEN 1 AND 4);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_personnalites_cercle ON personnalites(cercle);
CREATE INDEX IF NOT EXISTS idx_personnalites_sous_categorie ON personnalites(sous_categorie);
CREATE INDEX IF NOT EXISTS idx_personnalites_actif ON personnalites(actif);
CREATE INDEX IF NOT EXISTS idx_personnalites_niveau_alerte ON personnalites(niveau_alerte);

-- Table de liaison personnalités-mentions
CREATE TABLE IF NOT EXISTS personnalites_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personnalite_id UUID REFERENCES personnalites(id) ON DELETE CASCADE NOT NULL,
  mention_id UUID REFERENCES mentions(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(personnalite_id, mention_id)
);

-- Enable RLS
ALTER TABLE personnalites_mentions ENABLE ROW LEVEL SECURITY;

-- Policies pour personnalites_mentions
CREATE POLICY "Authenticated users can view personnalites_mentions" 
  ON personnalites_mentions FOR SELECT USING (true);

CREATE POLICY "Admins can manage personnalites_mentions" 
  ON personnalites_mentions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));