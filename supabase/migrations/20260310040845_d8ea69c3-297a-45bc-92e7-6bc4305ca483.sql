
-- Publications institutionnelles de l'ANSUT (auto-veille)
CREATE TABLE public.publications_institutionnelles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plateforme TEXT NOT NULL DEFAULT 'linkedin',
  type_contenu TEXT NOT NULL DEFAULT 'post',
  contenu TEXT,
  url_original TEXT,
  date_publication TIMESTAMP WITH TIME ZONE,
  auteur TEXT,
  est_officiel BOOLEAN DEFAULT true,
  likes_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  vues_count INTEGER DEFAULT 0,
  hashtags TEXT[] DEFAULT '{}',
  media_urls TEXT[] DEFAULT '{}',
  sentiment_commentaires NUMERIC,
  resume_commentaires TEXT,
  vip_compte_id UUID REFERENCES public.vip_comptes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.publications_institutionnelles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage publications_inst"
  ON public.publications_institutionnelles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view publications_inst"
  ON public.publications_institutionnelles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System can insert publications_inst"
  ON public.publications_institutionnelles FOR INSERT
  WITH CHECK (true);

-- Echo & Résonance metrics
CREATE TABLE public.echo_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID REFERENCES public.publications_institutionnelles(id) ON DELETE CASCADE,
  nb_reprises_presse INTEGER DEFAULT 0,
  sources_reprises TEXT[] DEFAULT '{}',
  nb_citations_influenceurs INTEGER DEFAULT 0,
  influenceurs_citant TEXT[] DEFAULT '{}',
  portee_estimee INTEGER DEFAULT 0,
  score_resonance NUMERIC DEFAULT 0,
  gap_media TEXT,
  recommandation_ia TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.echo_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage echo_metrics"
  ON public.echo_metrics FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view echo_metrics"
  ON public.echo_metrics FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System can insert echo_metrics"
  ON public.echo_metrics FOR INSERT
  WITH CHECK (true);

-- Part de voix mensuelle
CREATE TABLE public.part_de_voix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periode TEXT NOT NULL,
  mois DATE NOT NULL,
  nb_publications_ansut INTEGER DEFAULT 0,
  nb_articles_presse INTEGER DEFAULT 0,
  nb_mentions_social INTEGER DEFAULT 0,
  ratio_earned_owned NUMERIC DEFAULT 0,
  gap_analyse TEXT,
  recommandation_ia TEXT,
  top_sujets_ansut JSONB DEFAULT '[]',
  top_sujets_presse JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.part_de_voix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage part_de_voix"
  ON public.part_de_voix FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view part_de_voix"
  ON public.part_de_voix FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System can insert part_de_voix"
  ON public.part_de_voix FOR INSERT
  WITH CHECK (true);
