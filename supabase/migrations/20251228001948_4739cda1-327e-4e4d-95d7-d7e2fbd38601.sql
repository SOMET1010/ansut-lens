-- Créer la table des catégories de veille
CREATE TABLE public.categories_veille (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  couleur TEXT DEFAULT '#3b82f6',
  quadrant_default TEXT CHECK (quadrant_default IN ('tech', 'regulation', 'market', 'reputation')),
  priorite INTEGER DEFAULT 50,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer la table des mots-clés de veille
CREATE TABLE public.mots_cles_veille (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mot_cle TEXT NOT NULL,
  variantes TEXT[] DEFAULT '{}',
  categorie_id UUID REFERENCES public.categories_veille(id) ON DELETE CASCADE,
  quadrant TEXT CHECK (quadrant IN ('tech', 'regulation', 'market', 'reputation')),
  score_criticite INTEGER DEFAULT 50 CHECK (score_criticite >= 0 AND score_criticite <= 100),
  alerte_auto BOOLEAN DEFAULT false,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX idx_mots_cles_mot ON public.mots_cles_veille USING gin(to_tsvector('french', mot_cle));
CREATE INDEX idx_mots_cles_categorie ON public.mots_cles_veille(categorie_id);
CREATE INDEX idx_mots_cles_actif ON public.mots_cles_veille(actif);
CREATE INDEX idx_mots_cles_alerte ON public.mots_cles_veille(alerte_auto) WHERE alerte_auto = true;

-- Enable RLS
ALTER TABLE public.categories_veille ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mots_cles_veille ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour categories_veille
CREATE POLICY "Authenticated users can view categories"
ON public.categories_veille FOR SELECT
USING (true);

CREATE POLICY "Admins can manage categories"
ON public.categories_veille FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies pour mots_cles_veille
CREATE POLICY "Authenticated users can view mots_cles"
ON public.mots_cles_veille FOR SELECT
USING (true);

CREATE POLICY "Admins can manage mots_cles"
ON public.mots_cles_veille FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger pour updated_at
CREATE TRIGGER update_mots_cles_updated_at
BEFORE UPDATE ON public.mots_cles_veille
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ======= INSERTION DES CATÉGORIES =======
INSERT INTO public.categories_veille (nom, code, description, couleur, quadrant_default, priorite) VALUES
('ANSUT Institutionnel', 'ansut', 'Mots-clés liés directement à l''ANSUT et sa gouvernance', '#ef4444', 'reputation', 100),
('Service Universel & Inclusion', 'service_universel', 'Accès universel, inclusion numérique, zones blanches', '#f97316', 'market', 90),
('Technologies & Infrastructures', 'tech', 'Réseaux, 4G/5G, fibre, satellites, équipements', '#3b82f6', 'tech', 85),
('Opérateurs & Marché', 'operateurs', 'Orange CI, MTN, Moov, concurrence, parts de marché', '#10b981', 'market', 80),
('Régulation & Institutions', 'regulation', 'ARTCI, ministères, lois, décrets, conformité', '#8b5cf6', 'regulation', 85),
('Cybersécurité & Risques', 'cyber', 'Cyberattaques, sécurité, protection des données', '#dc2626', 'tech', 95),
('Données, Cloud & IA', 'cloud_ia', 'Cloud, data centers, intelligence artificielle', '#06b6d4', 'tech', 75),
('Financement & Partenariats', 'financement', 'PPP, investissements, fonds internationaux', '#84cc16', 'market', 70),
('Réputation & Médias', 'reputation', 'Image, polémiques, crises, médias', '#f59e0b', 'reputation', 90),
('Startups & Innovation', 'innovation', 'Startups TIC, GovTech, FinTech, EdTech', '#14b8a6', 'market', 65),
('Alertes Transversales', 'alertes', 'Mots-clés déclenchant alertes automatiques critiques', '#dc2626', 'reputation', 100),
('International', 'international', 'Organisations internationales, benchmarks régionaux', '#6366f1', 'regulation', 60);

-- ======= INSERTION DES MOTS-CLÉS (150+) =======

-- 1. ANSUT INSTITUTIONNEL (Priorité absolue)
INSERT INTO public.mots_cles_veille (mot_cle, variantes, categorie_id, quadrant, score_criticite, alerte_auto) VALUES
('ANSUT', ARRAY['Agence Nationale du Service Universel', 'Agence Service Universel CI'], (SELECT id FROM categories_veille WHERE code = 'ansut'), 'reputation', 100, true),
('Service Universel des Télécommunications', ARRAY['SUT', 'Service Universel TIC', 'Service Universel Télécom'], (SELECT id FROM categories_veille WHERE code = 'ansut'), 'reputation', 95, false),
('Fonds du Service Universel', ARRAY['FSU', 'FSU télécom', 'Fonds Service Universel'], (SELECT id FROM categories_veille WHERE code = 'ansut'), 'reputation', 90, false),
('Projets ANSUT', ARRAY['Programme ANSUT', 'Initiative ANSUT'], (SELECT id FROM categories_veille WHERE code = 'ansut'), 'reputation', 85, false),
('Direction Générale ANSUT', ARRAY['DG ANSUT', 'Directeur Général ANSUT'], (SELECT id FROM categories_veille WHERE code = 'ansut'), 'reputation', 95, true),
('Conseil d''Administration ANSUT', ARRAY['CA ANSUT', 'PCA ANSUT', 'Président CA ANSUT'], (SELECT id FROM categories_veille WHERE code = 'ansut'), 'reputation', 90, false),
('ANSUT Côte d''Ivoire', ARRAY['ANSUT CI', 'ANSUT Abidjan'], (SELECT id FROM categories_veille WHERE code = 'ansut'), 'reputation', 85, false);

-- 2. SERVICE UNIVERSEL & INCLUSION NUMÉRIQUE
INSERT INTO public.mots_cles_veille (mot_cle, variantes, categorie_id, quadrant, score_criticite, alerte_auto) VALUES
('Connectivité rurale', ARRAY['Internet rural', 'Télécom rural', 'Réseau rural'], (SELECT id FROM categories_veille WHERE code = 'service_universel'), 'market', 85, false),
('Zones blanches', ARRAY['Zone blanche', 'Zone non couverte', 'Désert numérique'], (SELECT id FROM categories_veille WHERE code = 'service_universel'), 'market', 80, false),
('Couverture télécom rurale', ARRAY['Couverture réseau rural', 'Extension réseau'], (SELECT id FROM categories_veille WHERE code = 'service_universel'), 'market', 75, false),
('Accès universel internet', ARRAY['Internet pour tous', 'Accès internet universel'], (SELECT id FROM categories_veille WHERE code = 'service_universel'), 'market', 85, false),
('Inclusion numérique', ARRAY['Inclusion digitale', 'E-inclusion'], (SELECT id FROM categories_veille WHERE code = 'service_universel'), 'market', 80, false),
('Fracture numérique', ARRAY['Digital divide', 'Fossé numérique'], (SELECT id FROM categories_veille WHERE code = 'service_universel'), 'market', 75, false),
('Villages connectés', ARRAY['Village connecté', 'Village numérique'], (SELECT id FROM categories_veille WHERE code = 'service_universel'), 'market', 80, false),
('Écoles connectées', ARRAY['École connectée', 'Éducation numérique rurale'], (SELECT id FROM categories_veille WHERE code = 'service_universel'), 'market', 75, false),
('Centres multimédias communautaires', ARRAY['CMC', 'Centre multimédia', 'Espace numérique communautaire'], (SELECT id FROM categories_veille WHERE code = 'service_universel'), 'market', 70, false),
('Télécentres', ARRAY['Télécentre communautaire', 'Point d''accès numérique'], (SELECT id FROM categories_veille WHERE code = 'service_universel'), 'market', 65, false),
('Espaces numériques ruraux', ARRAY['Espace numérique', 'Point numérique rural'], (SELECT id FROM categories_veille WHERE code = 'service_universel'), 'market', 65, false);

-- 3. TECHNOLOGIES & INFRASTRUCTURES
INSERT INTO public.mots_cles_veille (mot_cle, variantes, categorie_id, quadrant, score_criticite, alerte_auto) VALUES
('4G LTE', ARRAY['4G', 'LTE', 'Réseau 4G'], (SELECT id FROM categories_veille WHERE code = 'tech'), 'tech', 70, false),
('5G', ARRAY['Réseau 5G', '5G Afrique', '5G CI'], (SELECT id FROM categories_veille WHERE code = 'tech'), 'tech', 90, false),
('5G Côte d''Ivoire', ARRAY['5G CI', 'Déploiement 5G Abidjan'], (SELECT id FROM categories_veille WHERE code = 'tech'), 'tech', 85, false),
('Réseau national haut débit', ARRAY['Backbone national', 'RNHD'], (SELECT id FROM categories_veille WHERE code = 'tech'), 'tech', 80, false),
('Backbone national', ARRAY['Infrastructure backbone', 'Réseau dorsal'], (SELECT id FROM categories_veille WHERE code = 'tech'), 'tech', 80, false),
('Fibre optique', ARRAY['FTTH', 'FTTx', 'Fibre CI'], (SELECT id FROM categories_veille WHERE code = 'tech'), 'tech', 85, false),
('FTTH', ARRAY['Fiber to the Home', 'Fibre domicile'], (SELECT id FROM categories_veille WHERE code = 'tech'), 'tech', 75, false),
('Satellite LEO', ARRAY['Satellites basse orbite', 'LEO constellation'], (SELECT id FROM categories_veille WHERE code = 'tech'), 'tech', 85, false),
('Starlink', ARRAY['Starlink Afrique', 'SpaceX Starlink', 'Starlink CI'], (SELECT id FROM categories_veille WHERE code = 'tech'), 'tech', 90, true),
('OneWeb', ARRAY['OneWeb Afrique', 'OneWeb satellites'], (SELECT id FROM categories_veille WHERE code = 'tech'), 'tech', 80, false),
('Amazon Kuiper', ARRAY['Kuiper constellation', 'Amazon satellites'], (SELECT id FROM categories_veille WHERE code = 'tech'), 'tech', 75, false),
('TV White Spaces', ARRAY['TVWS', 'Espaces blancs TV'], (SELECT id FROM categories_veille WHERE code = 'tech'), 'tech', 70, false),
('FWA', ARRAY['Fixed Wireless Access', 'Accès fixe sans fil'], (SELECT id FROM categories_veille WHERE code = 'tech'), 'tech', 70, false),
('WiFi communautaire', ARRAY['WiFi rural', 'Hotspot communautaire'], (SELECT id FROM categories_veille WHERE code = 'tech'), 'tech', 65, false);

-- 4. OPÉRATEURS & MARCHÉ
INSERT INTO public.mots_cles_veille (mot_cle, variantes, categorie_id, quadrant, score_criticite, alerte_auto) VALUES
('Orange Côte d''Ivoire', ARRAY['Orange CI', 'OCI', 'Orange Abidjan'], (SELECT id FROM categories_veille WHERE code = 'operateurs'), 'market', 85, false),
('MTN Côte d''Ivoire', ARRAY['MTN CI', 'MTN Abidjan'], (SELECT id FROM categories_veille WHERE code = 'operateurs'), 'market', 85, false),
('Moov Africa', ARRAY['Moov CI', 'Moov Côte d''Ivoire', 'Maroc Telecom CI'], (SELECT id FROM categories_veille WHERE code = 'operateurs'), 'market', 85, false),
('Opérateurs télécoms CI', ARRAY['Opérateurs télécom Côte d''Ivoire', 'Telcos CI'], (SELECT id FROM categories_veille WHERE code = 'operateurs'), 'market', 75, false),
('Huawei', ARRAY['Huawei Afrique', 'Huawei CI', 'Huawei télécom'], (SELECT id FROM categories_veille WHERE code = 'operateurs'), 'tech', 80, false),
('Ericsson', ARRAY['Ericsson Afrique', 'Ericsson télécom'], (SELECT id FROM categories_veille WHERE code = 'operateurs'), 'tech', 75, false),
('Nokia', ARRAY['Nokia Networks', 'Nokia télécom'], (SELECT id FROM categories_veille WHERE code = 'operateurs'), 'tech', 75, false),
('ZTE', ARRAY['ZTE Afrique', 'ZTE télécom'], (SELECT id FROM categories_veille WHERE code = 'operateurs'), 'tech', 70, false),
('Cisco', ARRAY['Cisco Afrique', 'Cisco réseaux'], (SELECT id FROM categories_veille WHERE code = 'operateurs'), 'tech', 70, false);

-- 5. RÉGULATION & INSTITUTIONS
INSERT INTO public.mots_cles_veille (mot_cle, variantes, categorie_id, quadrant, score_criticite, alerte_auto) VALUES
('ARTCI', ARRAY['Autorité de Régulation', 'Régulateur télécom CI'], (SELECT id FROM categories_veille WHERE code = 'regulation'), 'regulation', 95, true),
('Ministère de la Transition Numérique', ARRAY['MTN CI', 'Ministère Numérique CI'], (SELECT id FROM categories_veille WHERE code = 'regulation'), 'regulation', 90, false),
('Ministère de la Communication', ARRAY['Ministère Communication CI'], (SELECT id FROM categories_veille WHERE code = 'regulation'), 'regulation', 85, false),
('État ivoirien numérique', ARRAY['Gouvernement numérique CI', 'Stratégie numérique CI'], (SELECT id FROM categories_veille WHERE code = 'regulation'), 'regulation', 80, false),
('e-Gouvernement CI', ARRAY['E-gouvernement', 'Services publics numériques CI'], (SELECT id FROM categories_veille WHERE code = 'regulation'), 'regulation', 75, false),
('UIT', ARRAY['Union Internationale des Télécommunications', 'ITU'], (SELECT id FROM categories_veille WHERE code = 'regulation'), 'regulation', 70, false),
('CEDEAO télécom', ARRAY['ECOWAS télécom', 'Régulation CEDEAO'], (SELECT id FROM categories_veille WHERE code = 'regulation'), 'regulation', 70, false),
('UEMOA numérique', ARRAY['UEMOA télécom', 'Marché unique UEMOA'], (SELECT id FROM categories_veille WHERE code = 'regulation'), 'regulation', 70, false),
('Banque Mondiale télécom', ARRAY['World Bank digital', 'Financement BM télécom'], (SELECT id FROM categories_veille WHERE code = 'regulation'), 'regulation', 65, false),
('BAD numérique', ARRAY['AfDB digital', 'Banque Africaine numérique'], (SELECT id FROM categories_veille WHERE code = 'regulation'), 'regulation', 65, false);

-- 6. CYBERSÉCURITÉ & RISQUES
INSERT INTO public.mots_cles_veille (mot_cle, variantes, categorie_id, quadrant, score_criticite, alerte_auto) VALUES
('Cyberattaque', ARRAY['Cyber attaque', 'Attaque informatique', 'Piratage'], (SELECT id FROM categories_veille WHERE code = 'cyber'), 'tech', 100, true),
('Cybercriminalité', ARRAY['Cybercrime', 'Crime numérique'], (SELECT id FROM categories_veille WHERE code = 'cyber'), 'tech', 95, true),
('Ransomware', ARRAY['Rançongiciel', 'Logiciel de rançon'], (SELECT id FROM categories_veille WHERE code = 'cyber'), 'tech', 95, true),
('Piratage système', ARRAY['Hacking', 'Intrusion système'], (SELECT id FROM categories_veille WHERE code = 'cyber'), 'tech', 90, true),
('Fuite de données', ARRAY['Data breach', 'Violation données', 'Données compromises'], (SELECT id FROM categories_veille WHERE code = 'cyber'), 'tech', 95, true),
('Espionnage numérique', ARRAY['Cyber espionnage', 'Espionnage informatique'], (SELECT id FROM categories_veille WHERE code = 'cyber'), 'tech', 90, true),
('Cybersécurité gouvernementale', ARRAY['Sécurité gouvernement', 'Cyber défense'], (SELECT id FROM categories_veille WHERE code = 'cyber'), 'tech', 85, false),
('Souveraineté numérique', ARRAY['Souveraineté digitale', 'Autonomie numérique'], (SELECT id FROM categories_veille WHERE code = 'cyber'), 'regulation', 80, false),
('Cloud souverain', ARRAY['Cloud national', 'Cloud gouvernemental'], (SELECT id FROM categories_veille WHERE code = 'cyber'), 'tech', 80, false),
('Data center national', ARRAY['Datacenter CI', 'Centre de données national'], (SELECT id FROM categories_veille WHERE code = 'cyber'), 'tech', 75, false),
('Sécurité infrastructures critiques', ARRAY['Protection infrastructures', 'Infrastructures critiques'], (SELECT id FROM categories_veille WHERE code = 'cyber'), 'tech', 90, false);

-- 7. DONNÉES, CLOUD & IA
INSERT INTO public.mots_cles_veille (mot_cle, variantes, categorie_id, quadrant, score_criticite, alerte_auto) VALUES
('Cloud public', ARRAY['Public cloud', 'IaaS', 'PaaS'], (SELECT id FROM categories_veille WHERE code = 'cloud_ia'), 'tech', 65, false),
('Cloud privé', ARRAY['Private cloud', 'Cloud entreprise'], (SELECT id FROM categories_veille WHERE code = 'cloud_ia'), 'tech', 65, false),
('Data center Afrique', ARRAY['Datacenter Afrique', 'Centre données africain'], (SELECT id FROM categories_veille WHERE code = 'cloud_ia'), 'tech', 70, false),
('Hébergement gouvernemental', ARRAY['Hosting gouvernement', 'Hébergement souverain'], (SELECT id FROM categories_veille WHERE code = 'cloud_ia'), 'tech', 75, false),
('Intelligence artificielle Afrique', ARRAY['IA Afrique', 'AI Afrique'], (SELECT id FROM categories_veille WHERE code = 'cloud_ia'), 'tech', 80, false),
('IA gouvernementale', ARRAY['GovAI', 'IA secteur public'], (SELECT id FROM categories_veille WHERE code = 'cloud_ia'), 'tech', 75, false),
('IA télécom', ARRAY['AI télécom', 'Intelligence artificielle réseau'], (SELECT id FROM categories_veille WHERE code = 'cloud_ia'), 'tech', 75, false),
('Big Data', ARRAY['Mégadonnées', 'Données massives'], (SELECT id FROM categories_veille WHERE code = 'cloud_ia'), 'tech', 70, false),
('Analyse prédictive', ARRAY['Predictive analytics', 'Prédiction données'], (SELECT id FROM categories_veille WHERE code = 'cloud_ia'), 'tech', 65, false);

-- 8. FINANCEMENT & PARTENARIATS
INSERT INTO public.mots_cles_veille (mot_cle, variantes, categorie_id, quadrant, score_criticite, alerte_auto) VALUES
('Financement infrastructures télécom', ARRAY['Investissement télécom', 'Funding télécom'], (SELECT id FROM categories_veille WHERE code = 'financement'), 'market', 75, false),
('Partenariats public-privé télécom', ARRAY['PPP télécom', 'Partenariat PPP'], (SELECT id FROM categories_veille WHERE code = 'financement'), 'market', 80, false),
('PPP numérique', ARRAY['PPP digital', 'Partenariat public-privé numérique'], (SELECT id FROM categories_veille WHERE code = 'financement'), 'market', 75, false),
('Fonds internationaux TIC', ARRAY['Fonds télécom international', 'Financement TIC'], (SELECT id FROM categories_veille WHERE code = 'financement'), 'market', 70, false),
('Investissements télécom Afrique', ARRAY['Investment télécom Afrique', 'Capex télécom'], (SELECT id FROM categories_veille WHERE code = 'financement'), 'market', 70, false),
('Donateurs numériques', ARRAY['Bailleurs numériques', 'Aide développement TIC'], (SELECT id FROM categories_veille WHERE code = 'financement'), 'market', 65, false);

-- 9. RÉPUTATION & MÉDIAS
INSERT INTO public.mots_cles_veille (mot_cle, variantes, categorie_id, quadrant, score_criticite, alerte_auto) VALUES
('ANSUT polémique', ARRAY['Controverse ANSUT', 'ANSUT critique'], (SELECT id FROM categories_veille WHERE code = 'reputation'), 'reputation', 100, true),
('Projet télécom contesté', ARRAY['Projet controversé', 'Opposition projet télécom'], (SELECT id FROM categories_veille WHERE code = 'reputation'), 'reputation', 90, true),
('Internet rural échec', ARRAY['Échec connectivité', 'Retard internet rural'], (SELECT id FROM categories_veille WHERE code = 'reputation'), 'reputation', 85, true),
('Retard projets numériques', ARRAY['Délai projets TIC', 'Retard déploiement'], (SELECT id FROM categories_veille WHERE code = 'reputation'), 'reputation', 80, false),
('Critiques service universel', ARRAY['Service universel critiqué', 'FSU contesté'], (SELECT id FROM categories_veille WHERE code = 'reputation'), 'reputation', 90, true),
('Audit télécom', ARRAY['Audit ANSUT', 'Contrôle télécom'], (SELECT id FROM categories_veille WHERE code = 'reputation'), 'reputation', 95, true),
('Rapport Cour des Comptes', ARRAY['CDC rapport', 'Audit Cour des Comptes'], (SELECT id FROM categories_veille WHERE code = 'reputation'), 'reputation', 100, true),
('Rapport IGE', ARRAY['Inspection Générale État', 'IGE rapport'], (SELECT id FROM categories_veille WHERE code = 'reputation'), 'reputation', 100, true),
('Enquête télécom', ARRAY['Investigation télécom', 'Enquête ANSUT'], (SELECT id FROM categories_veille WHERE code = 'reputation'), 'reputation', 95, true),
('Détournement fonds TIC', ARRAY['Malversation télécom', 'Corruption TIC'], (SELECT id FROM categories_veille WHERE code = 'reputation'), 'reputation', 100, true);

-- 10. STARTUPS & INNOVATION
INSERT INTO public.mots_cles_veille (mot_cle, variantes, categorie_id, quadrant, score_criticite, alerte_auto) VALUES
('Startups TIC Côte d''Ivoire', ARRAY['Startup tech CI', 'Startups numériques CI'], (SELECT id FROM categories_veille WHERE code = 'innovation'), 'market', 65, false),
('Innovation numérique CI', ARRAY['Innovation digitale CI', 'Tech innovation CI'], (SELECT id FROM categories_veille WHERE code = 'innovation'), 'market', 65, false),
('GovTech Afrique', ARRAY['GovTech CI', 'Tech gouvernementale'], (SELECT id FROM categories_veille WHERE code = 'innovation'), 'market', 70, false),
('FinTech inclusion financière', ARRAY['FinTech CI', 'Mobile money'], (SELECT id FROM categories_veille WHERE code = 'innovation'), 'market', 70, false),
('EdTech Afrique', ARRAY['EdTech CI', 'E-learning Afrique'], (SELECT id FROM categories_veille WHERE code = 'innovation'), 'market', 65, false),
('Smart villages', ARRAY['Village intelligent', 'Villages numériques'], (SELECT id FROM categories_veille WHERE code = 'innovation'), 'market', 70, false);

-- 11. ALERTES TRANSVERSALES (Alerte automatique critique)
INSERT INTO public.mots_cles_veille (mot_cle, variantes, categorie_id, quadrant, score_criticite, alerte_auto) VALUES
('crise', ARRAY['situation de crise', 'urgence', 'crise majeure'], (SELECT id FROM categories_veille WHERE code = 'alertes'), 'reputation', 100, true),
('scandale', ARRAY['affaire', 'révélation', 'scandale public'], (SELECT id FROM categories_veille WHERE code = 'alertes'), 'reputation', 100, true),
('audit', ARRAY['contrôle', 'vérification', 'inspection'], (SELECT id FROM categories_veille WHERE code = 'alertes'), 'reputation', 95, true),
('suspension', ARRAY['suspendu', 'mise en suspension', 'arrêt temporaire'], (SELECT id FROM categories_veille WHERE code = 'alertes'), 'reputation', 95, true),
('sanction', ARRAY['pénalité', 'amende', 'condamnation'], (SELECT id FROM categories_veille WHERE code = 'alertes'), 'reputation', 95, true),
('litige', ARRAY['contentieux', 'conflit juridique', 'procès'], (SELECT id FROM categories_veille WHERE code = 'alertes'), 'reputation', 90, true),
('blocage', ARRAY['bloqué', 'obstruction', 'impasse'], (SELECT id FROM categories_veille WHERE code = 'alertes'), 'reputation', 85, true),
('cyber incident', ARRAY['incident cybersécurité', 'incident informatique'], (SELECT id FROM categories_veille WHERE code = 'alertes'), 'tech', 100, true),
('panne réseau', ARRAY['coupure réseau', 'interruption réseau', 'panne télécom'], (SELECT id FROM categories_veille WHERE code = 'alertes'), 'tech', 95, true),
('interruption service', ARRAY['service interrompu', 'indisponibilité', 'coupure service'], (SELECT id FROM categories_veille WHERE code = 'alertes'), 'tech', 90, true),
('détournement', ARRAY['détournement de fonds', 'malversation', 'fraude'], (SELECT id FROM categories_veille WHERE code = 'alertes'), 'reputation', 100, true);

-- 12. INTERNATIONAL
INSERT INTO public.mots_cles_veille (mot_cle, variantes, categorie_id, quadrant, score_criticite, alerte_auto) VALUES
('Smart Africa', ARRAY['Smart Africa Alliance', 'Initiative Smart Africa'], (SELECT id FROM categories_veille WHERE code = 'international'), 'regulation', 70, false),
('African Union digital', ARRAY['UA numérique', 'Union Africaine TIC'], (SELECT id FROM categories_veille WHERE code = 'international'), 'regulation', 65, false),
('Digital Transformation Strategy Africa', ARRAY['DTS Afrique', 'Transformation digitale UA'], (SELECT id FROM categories_veille WHERE code = 'international'), 'regulation', 65, false),
('GSMA Afrique', ARRAY['GSMA Mobile Economy', 'GSMA Africa'], (SELECT id FROM categories_veille WHERE code = 'international'), 'market', 60, false),
('ITU-D', ARRAY['Développement UIT', 'ITU Development'], (SELECT id FROM categories_veille WHERE code = 'international'), 'regulation', 60, false),
('Alliance for Affordable Internet', ARRAY['A4AI', 'Internet abordable'], (SELECT id FROM categories_veille WHERE code = 'international'), 'market', 60, false),
('Internet Society Afrique', ARRAY['ISOC Afrique', 'Internet Society CI'], (SELECT id FROM categories_veille WHERE code = 'international'), 'regulation', 55, false),
('AfricaConnect', ARRAY['Africa Connect', 'GÉANT Afrique'], (SELECT id FROM categories_veille WHERE code = 'international'), 'tech', 60, false);