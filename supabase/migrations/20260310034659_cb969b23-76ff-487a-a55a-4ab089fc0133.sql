
-- Table pour les événements stratégiques (MWC, Gitex, Africa Tech Festival, etc.)
CREATE TABLE public.evenements_strategiques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  description TEXT,
  lieu TEXT,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  mots_cles TEXT[] DEFAULT '{}',
  boost_actif BOOLEAN DEFAULT false,
  frequence_boost TEXT DEFAULT '1h',
  categorie TEXT DEFAULT 'telecom',
  importance INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.evenements_strategiques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage evenements" ON public.evenements_strategiques
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view evenements" ON public.evenements_strategiques
  FOR SELECT TO authenticated
  USING (true);
