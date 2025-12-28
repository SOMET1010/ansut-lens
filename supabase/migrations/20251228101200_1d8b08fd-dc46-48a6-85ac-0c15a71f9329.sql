-- Table pour les dossiers stratégiques
CREATE TABLE public.dossiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titre TEXT NOT NULL,
  resume TEXT,
  contenu TEXT,
  categorie TEXT NOT NULL DEFAULT 'general' CHECK (categorie IN ('sut', 'ia', 'acteurs', 'general')),
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'publie', 'archive')),
  auteur_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les recherches
CREATE INDEX idx_dossiers_categorie ON public.dossiers(categorie);
CREATE INDEX idx_dossiers_statut ON public.dossiers(statut);

-- Enable RLS
ALTER TABLE public.dossiers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view published dossiers"
ON public.dossiers FOR SELECT
USING (statut = 'publie' OR auth.uid() = auteur_id);

CREATE POLICY "Admins can manage all dossiers"
ON public.dossiers FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authors can update own dossiers"
ON public.dossiers FOR UPDATE
USING (auth.uid() = auteur_id);

-- Trigger pour updated_at
CREATE TRIGGER update_dossiers_updated_at
BEFORE UPDATE ON public.dossiers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();