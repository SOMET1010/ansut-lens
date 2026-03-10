
CREATE TABLE IF NOT EXISTS public.territoires_expression (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  description TEXT,
  concepts TEXT[] DEFAULT '{}'::text[],
  mots_cles_associes TEXT[] DEFAULT '{}'::text[],
  hashtags TEXT[] DEFAULT '{}'::text[],
  pays_cibles TEXT[] DEFAULT '{}'::text[],
  actif BOOLEAN DEFAULT true,
  priorite INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.territoires_expression ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'territoires_expression' AND policyname = 'Admins can manage territoires') THEN
    CREATE POLICY "Admins can manage territoires" ON public.territoires_expression FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'territoires_expression' AND policyname = 'Authenticated can view territoires') THEN
    CREATE POLICY "Authenticated can view territoires" ON public.territoires_expression FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.influenceurs_metier (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  fonction TEXT,
  organisation TEXT,
  pays TEXT DEFAULT 'International',
  plateforme TEXT NOT NULL DEFAULT 'linkedin',
  identifiant TEXT NOT NULL,
  url_profil TEXT,
  categorie TEXT DEFAULT 'expert',
  score_pertinence INTEGER DEFAULT 50,
  actif BOOLEAN DEFAULT true,
  derniere_activite TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.influenceurs_metier ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'influenceurs_metier' AND policyname = 'Admins can manage influenceurs') THEN
    CREATE POLICY "Admins can manage influenceurs" ON public.influenceurs_metier FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'influenceurs_metier' AND policyname = 'Authenticated can view influenceurs') THEN
    CREATE POLICY "Authenticated can view influenceurs" ON public.influenceurs_metier FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
