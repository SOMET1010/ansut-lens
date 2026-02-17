
-- Weekly digest configuration table
CREATE TABLE public.weekly_digest_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actif BOOLEAN NOT NULL DEFAULT false,
  jour_envoi INTEGER NOT NULL DEFAULT 1, -- 0=dimanche..6=samedi, 1=lundi
  heure_envoi TEXT NOT NULL DEFAULT '08:00',
  nb_top_stories INTEGER NOT NULL DEFAULT 10,
  sentiment_alert_threshold NUMERIC NOT NULL DEFAULT -0.2,
  include_sentiment_chart BOOLEAN NOT NULL DEFAULT true,
  include_top_sources BOOLEAN NOT NULL DEFAULT true,
  recipients TEXT[] NOT NULL DEFAULT '{}',
  derniere_execution TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weekly_digest_config ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can manage digest config"
ON public.weekly_digest_config FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed a default row
INSERT INTO public.weekly_digest_config (actif, jour_envoi, heure_envoi, nb_top_stories)
VALUES (false, 1, '08:00', 10);

-- Trigger for updated_at
CREATE TRIGGER update_weekly_digest_config_updated_at
BEFORE UPDATE ON public.weekly_digest_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
