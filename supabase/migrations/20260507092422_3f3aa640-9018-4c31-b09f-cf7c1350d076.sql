ALTER TABLE public.titrologie_unes
  ADD COLUMN IF NOT EXISTS angles JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_titrologie_unes_angles ON public.titrologie_unes USING GIN(angles);