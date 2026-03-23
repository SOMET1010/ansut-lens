ALTER TABLE public.social_insights ADD COLUMN IF NOT EXISTS vip_compte_id uuid REFERENCES public.vip_comptes(id);

CREATE INDEX IF NOT EXISTS idx_social_insights_vip_compte_id ON public.social_insights(vip_compte_id) WHERE vip_compte_id IS NOT NULL;