
-- Table de programmation par canal
CREATE TABLE public.diffusion_programmation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canal varchar NOT NULL CHECK (canal IN ('sms', 'telegram', 'email', 'whatsapp')),
  actif boolean NOT NULL DEFAULT false,
  frequence varchar NOT NULL DEFAULT 'quotidien' CHECK (frequence IN ('quotidien', 'hebdo', 'mensuel')),
  heure_envoi time NOT NULL DEFAULT '08:00',
  jours_envoi int[] DEFAULT NULL,
  destinataires jsonb NOT NULL DEFAULT '[]'::jsonb,
  contenu_type varchar NOT NULL DEFAULT 'briefing' CHECK (contenu_type IN ('briefing', 'newsletter', 'alerte')),
  dernier_envoi timestamptz DEFAULT NULL,
  prochain_envoi timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(canal)
);

-- Table des logs de diffusion
CREATE TABLE public.diffusion_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canal varchar NOT NULL,
  contenu_type varchar NOT NULL DEFAULT 'briefing',
  message text,
  destinataires_count int NOT NULL DEFAULT 0,
  succes_count int NOT NULL DEFAULT 0,
  echec_count int NOT NULL DEFAULT 0,
  details jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.diffusion_programmation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diffusion_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies using has_permission
CREATE POLICY "Users with manage_newsletters can view diffusion_programmation"
  ON public.diffusion_programmation FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_newsletters'));

CREATE POLICY "Users with manage_newsletters can insert diffusion_programmation"
  ON public.diffusion_programmation FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'manage_newsletters'));

CREATE POLICY "Users with manage_newsletters can update diffusion_programmation"
  ON public.diffusion_programmation FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_newsletters'));

CREATE POLICY "Users with manage_newsletters can delete diffusion_programmation"
  ON public.diffusion_programmation FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_newsletters'));

CREATE POLICY "Users with manage_newsletters can view diffusion_logs"
  ON public.diffusion_logs FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_newsletters'));

CREATE POLICY "Users with manage_newsletters can insert diffusion_logs"
  ON public.diffusion_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'manage_newsletters'));

-- Trigger updated_at
CREATE TRIGGER update_diffusion_programmation_updated_at
  BEFORE UPDATE ON public.diffusion_programmation
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial channel configs
INSERT INTO public.diffusion_programmation (canal, actif, frequence, heure_envoi, contenu_type, destinataires)
VALUES
  ('sms', false, 'quotidien', '08:00', 'briefing', '[]'::jsonb),
  ('telegram', false, 'quotidien', '08:00', 'briefing', '[]'::jsonb),
  ('email', false, 'hebdo', '10:00', 'briefing', '[]'::jsonb),
  ('whatsapp', false, 'quotidien', '08:00', 'briefing', '[]'::jsonb);
