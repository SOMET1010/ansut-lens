
-- Analyses visuelles (image analysis results)
CREATE TABLE public.analyses_visuelles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_url TEXT,
  image_url TEXT NOT NULL,
  plateforme TEXT,
  auteur TEXT,
  resultat_analyse JSONB DEFAULT '{}'::jsonb,
  logos_detectes TEXT[] DEFAULT '{}'::text[],
  pertinence_ansut BOOLEAN DEFAULT false,
  score_pertinence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.analyses_visuelles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage analyses_visuelles" ON public.analyses_visuelles
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view analyses_visuelles" ON public.analyses_visuelles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert analyses_visuelles" ON public.analyses_visuelles
  FOR INSERT TO public WITH CHECK (true);

-- Radar de proximité (look-alike projects from neighboring countries)
CREATE TABLE public.radar_proximite (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pays TEXT NOT NULL,
  titre TEXT NOT NULL,
  description TEXT,
  organisme TEXT,
  similitude_score INTEGER DEFAULT 0,
  projet_ansut_equivalent TEXT,
  recommandation_com TEXT,
  source_url TEXT,
  date_detection TIMESTAMPTZ DEFAULT now(),
  traite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.radar_proximite ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage radar_proximite" ON public.radar_proximite
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view radar_proximite" ON public.radar_proximite
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert radar_proximite" ON public.radar_proximite
  FOR INSERT TO public WITH CHECK (true);
