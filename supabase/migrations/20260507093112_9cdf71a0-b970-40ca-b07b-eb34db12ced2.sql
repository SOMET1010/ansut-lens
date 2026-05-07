
-- Titrologie sources (sites scannés pour la revue de presse quotidienne)
CREATE TABLE IF NOT EXISTS public.titrologie_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  url text NOT NULL,
  type text NOT NULL DEFAULT 'aggregateur',
  actif boolean NOT NULL DEFAULT true,
  priorite integer NOT NULL DEFAULT 50,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.titrologie_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage titrologie_sources" ON public.titrologie_sources
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Authenticated view titrologie_sources" ON public.titrologie_sources
  FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_titrologie_sources_updated BEFORE UPDATE ON public.titrologie_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Mots-clés Service Universel pour scoring risque réputationnel titrologie
CREATE TABLE IF NOT EXISTS public.titrologie_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mot_cle text NOT NULL UNIQUE,
  categorie text NOT NULL DEFAULT 'sectoriel',
  poids integer NOT NULL DEFAULT 2,
  actif boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.titrologie_keywords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage titrologie_keywords" ON public.titrologie_keywords
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Authenticated view titrologie_keywords" ON public.titrologie_keywords
  FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_titrologie_keywords_updated BEFORE UPDATE ON public.titrologie_keywords
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed sources
INSERT INTO public.titrologie_sources (nom, url, type, priorite) VALUES
  ('abidjan.net Titrologie', 'https://news.abidjan.net/titrologie', 'aggregateur', 100),
  ('Linfodrome', 'https://www.linfodrome.com', 'national', 80),
  ('Koaci', 'https://www.koaci.com', 'national', 80),
  ('Fraternité Matin', 'https://www.fratmat.info', 'national', 80),
  ('AIP', 'https://www.aip.ci', 'agence', 70)
ON CONFLICT DO NOTHING;

-- Seed mots-clés (alignés sur Service Universel / Numérique)
INSERT INTO public.titrologie_keywords (mot_cle, categorie, poids) VALUES
  ('ansut','direct',6),('mtnd','direct',5),('artci','direct',4),('service universel','direct',5),
  ('zones blanches','sectoriel',3),('fibre','sectoriel',3),('haut débit','sectoriel',3),
  ('5g','sectoriel',3),('4g','sectoriel',2),('cybersécurité','sectoriel',3),('cyber','sectoriel',2),
  ('datacenter','sectoriel',3),('data center','sectoriel',3),('cloud souverain','sectoriel',3),
  ('inclusion numérique','sectoriel',3),('accès rural','sectoriel',3),('e-services','sectoriel',2),
  ('dématérialisation','sectoriel',2),('intelligence artificielle','sectoriel',2),('ia','sectoriel',1),
  ('starlink','concurrence',2),('orange ci','concurrence',2),('mtn ci','concurrence',2),('moov africa','concurrence',2)
ON CONFLICT (mot_cle) DO NOTHING;
