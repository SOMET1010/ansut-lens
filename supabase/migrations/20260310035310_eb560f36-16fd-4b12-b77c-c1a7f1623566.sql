
-- Table: VIP accounts to track (Shadow Tracker)
CREATE TABLE public.vip_comptes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  personnalite_id UUID REFERENCES public.personnalites(id) ON DELETE SET NULL,
  nom TEXT NOT NULL,
  fonction TEXT,
  plateforme TEXT NOT NULL DEFAULT 'linkedin',
  identifiant TEXT NOT NULL,
  url_profil TEXT,
  actif BOOLEAN DEFAULT true,
  derniere_verification TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.vip_comptes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage vip_comptes" ON public.vip_comptes
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view vip_comptes" ON public.vip_comptes
  FOR SELECT TO authenticated USING (true);

-- Table: VIP post alerts (Shadow Tracker detections)
CREATE TABLE public.vip_alertes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vip_compte_id UUID REFERENCES public.vip_comptes(id) ON DELETE CASCADE NOT NULL,
  contenu TEXT,
  url_post TEXT,
  plateforme TEXT NOT NULL,
  date_publication TIMESTAMPTZ,
  analyse_conformite JSONB DEFAULT '{}'::jsonb,
  niveau_risque TEXT DEFAULT 'normal',
  traitee BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.vip_alertes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage vip_alertes" ON public.vip_alertes
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view vip_alertes" ON public.vip_alertes
  FOR SELECT TO authenticated USING (true);

-- Insert via service role or system
CREATE POLICY "System can insert vip_alertes" ON public.vip_alertes
  FOR INSERT TO public WITH CHECK (true);

-- Table: Validated content library (Coffre-fort à Contenus)
CREATE TABLE public.contenus_valides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titre TEXT NOT NULL,
  contenu TEXT NOT NULL,
  type TEXT DEFAULT 'linkedin_post',
  categorie TEXT DEFAULT 'general',
  hashtags TEXT[] DEFAULT '{}'::text[],
  image_url TEXT,
  valide_par UUID,
  utilise_count INTEGER DEFAULT 0,
  actif BOOLEAN DEFAULT true,
  expire_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contenus_valides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage contenus_valides" ON public.contenus_valides
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view contenus_valides" ON public.contenus_valides
  FOR SELECT TO authenticated USING (true);

-- Enable realtime for VIP alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.vip_alertes;
