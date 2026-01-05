-- Table pour stocker les newsletters générées
CREATE TABLE public.newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Métadonnées
  numero INTEGER NOT NULL,
  periode VARCHAR(20) NOT NULL DEFAULT 'mensuel',
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  
  -- Paramètres de génération
  ton VARCHAR(20) NOT NULL DEFAULT 'pedagogique',
  cible VARCHAR(20) NOT NULL DEFAULT 'general',
  
  -- Contenu structuré (JSON)
  contenu JSONB NOT NULL DEFAULT '{}',
  
  -- Contenu HTML final
  html_court TEXT,
  html_complet TEXT,
  html_social TEXT,
  
  -- Workflow
  statut VARCHAR(20) NOT NULL DEFAULT 'brouillon',
  genere_par UUID REFERENCES auth.users(id),
  valide_par UUID REFERENCES auth.users(id),
  date_validation TIMESTAMPTZ,
  date_envoi TIMESTAMPTZ,
  
  -- Stats
  nb_destinataires INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour les destinataires
CREATE TABLE public.newsletter_destinataires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  nom VARCHAR(255),
  type VARCHAR(20) NOT NULL DEFAULT 'general',
  actif BOOLEAN DEFAULT true,
  frequence VARCHAR(20) DEFAULT 'mensuel',
  derniere_reception TIMESTAMPTZ,
  nb_receptions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email)
);

-- Index
CREATE INDEX idx_newsletters_statut ON newsletters(statut);
CREATE INDEX idx_newsletters_periode ON newsletters(periode, date_debut);
CREATE INDEX idx_newsletter_destinataires_type ON newsletter_destinataires(type, actif);

-- Enable RLS
ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_destinataires ENABLE ROW LEVEL SECURITY;

-- Policies pour newsletters (admin seulement)
CREATE POLICY "Admins can manage newsletters"
ON public.newsletters
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policies pour destinataires (admin seulement)
CREATE POLICY "Admins can manage newsletter recipients"
ON public.newsletter_destinataires
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger pour updated_at
CREATE TRIGGER update_newsletters_updated_at
  BEFORE UPDATE ON public.newsletters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_newsletter_destinataires_updated_at
  BEFORE UPDATE ON public.newsletter_destinataires
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();