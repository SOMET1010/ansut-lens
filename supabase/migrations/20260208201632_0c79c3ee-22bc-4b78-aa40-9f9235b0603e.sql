
-- Table des destinataires SMS pour les alertes critiques
CREATE TABLE public.sms_destinataires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  numero text NOT NULL,
  actif boolean DEFAULT true,
  role_filtre text DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

-- Table de logs des envois SMS
CREATE TABLE public.sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alerte_id uuid REFERENCES public.alertes(id),
  destinataire text NOT NULL,
  message text NOT NULL,
  statut text DEFAULT 'pending',
  erreur text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sms_destinataires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- Admins can manage SMS recipients
CREATE POLICY "admin_manage_sms_destinataires" ON public.sms_destinataires
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view SMS logs
CREATE POLICY "admin_view_sms_logs" ON public.sms_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Service/system can insert SMS logs (edge function uses service role)
CREATE POLICY "service_insert_sms_logs" ON public.sms_logs
  FOR INSERT WITH CHECK (true);
