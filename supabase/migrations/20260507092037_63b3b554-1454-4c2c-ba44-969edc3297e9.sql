-- Table principale des unes de presse
CREATE TABLE public.titrologie_unes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date_parution DATE NOT NULL DEFAULT CURRENT_DATE,
  journal TEXT NOT NULL,
  image_url TEXT,
  source_url TEXT,
  titre_une TEXT NOT NULL,
  sujet TEXT,
  ton TEXT,
  risque_ansut TEXT NOT NULL DEFAULT 'VERT',
  lien_ansut TEXT,
  themes TEXT[] DEFAULT '{}',
  raw_ocr TEXT,
  analyse_ia JSONB DEFAULT '{}'::jsonb,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_titrologie_unes_date ON public.titrologie_unes(date_parution DESC);
CREATE INDEX idx_titrologie_unes_journal ON public.titrologie_unes(journal);
CREATE INDEX idx_titrologie_unes_risque ON public.titrologie_unes(risque_ansut) WHERE risque_ansut IN ('ROUGE','ORANGE');

ALTER TABLE public.titrologie_unes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read titrologie_unes"
ON public.titrologie_unes FOR SELECT
TO authenticated USING (true);

-- Table de suivi des exécutions
CREATE TABLE public.titrologie_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  unes_collected INTEGER NOT NULL DEFAULT 0,
  unes_analyzed INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX idx_titrologie_runs_date ON public.titrologie_runs(run_date DESC);

ALTER TABLE public.titrologie_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read titrologie_runs"
ON public.titrologie_runs FOR SELECT
TO authenticated USING (true);