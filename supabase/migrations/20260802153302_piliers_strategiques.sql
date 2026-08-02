-- =============================================================================
-- Phase 2 — Socle « pilotage stratégique »
--
-- Référentiel des 7 piliers de la Feuille de route 2026-2028 du MTNIT, éditable
-- en administration, et colonnes d'alignement sur les actualités (rattachement
-- au pilier impacté, action suggérée, confiance). Ce socle remplacera à terme le
-- référentiel codé côté client (src/config/missions.ts) comme source de vérité.
-- =============================================================================

-- 1. Référentiel des piliers stratégiques -------------------------------------

CREATE TABLE IF NOT EXISTS public.piliers_strategiques (
  id            text PRIMARY KEY,                       -- slug stable
  code          text NOT NULL,                          -- P1..P7
  nom           text NOT NULL,
  objectif      text,
  ansut_porteur boolean NOT NULL DEFAULT false,
  projets_ansut text[] NOT NULL DEFAULT '{}',
  mots_cles     text[] NOT NULL DEFAULT '{}',
  ordre         integer NOT NULL DEFAULT 0,
  actif         boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.piliers_strategiques ENABLE ROW LEVEL SECURITY;

-- Lecture par tout utilisateur authentifié (l'app lit le référentiel).
CREATE POLICY "Authenticated view piliers_strategiques"
  ON public.piliers_strategiques
  FOR SELECT TO authenticated
  USING (true);

-- Édition réservée aux administrateurs (gouvernance éditable en admin).
CREATE POLICY "Admins manage piliers_strategiques"
  ON public.piliers_strategiques
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_piliers_strategiques_updated_at
  BEFORE UPDATE ON public.piliers_strategiques
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_piliers_strategiques_actif
  ON public.piliers_strategiques(actif, ordre);

-- 2. Amorce : les 7 piliers officiels -----------------------------------------

INSERT INTO public.piliers_strategiques (id, code, nom, objectif, ansut_porteur, projets_ansut, mots_cles, ordre)
VALUES
  (
    'connectivite-acces', 'P1',
    'Connectivité, Accès & Accessibilité à l''Internet',
    'Démocratiser la connectivité, l''accès aux terminaux et aux données à l''échelle nationale.',
    true,
    ARRAY[
      'Étendre la couverture numérique nationale par les technologies satellitaires (RNHD)',
      'Favoriser l''accessibilité aux équipements et contenus numériques',
      'Élaborer une politique nationale des infrastructures numériques'
    ],
    ARRAY[
      'infrastructures numériques','couverture numérique','couverture mobile','couverture réseau',
      'connectivité','zone blanche','zones blanches','localités connectées','localité connectée',
      'rnhd','réseau national haut débit','haut débit','fibre optique','fibre','satellite',
      'technologies satellitaires','starlink','ast spacemobile','direct-to-cell','terminaux','smartphone',
      'communications électroniques','télécommunications','télécoms','opérateurs','régulation télécoms',
      'spectre','centre de données','datacenter','data center','point d''échange internet','orange','mtn',
      'moov','mvno','pncr','connectivité rurale','orbite basse','low earth orbit','digital infrastructure',
      'network coverage','mobile coverage','connectivity','broadband','fiber','fibre','satellite internet',
      'unconnected','rural connectivity','telecom operators','spectrum','data centre'
    ],
    1
  ),
  (
    'transformation-administration', 'P2',
    'Transformation numérique de l''administration',
    'Numériser les services publics prioritaires et leurs registres de référence.',
    false, ARRAY[]::text[],
    ARRAY[
      'transformation numérique','gouvernement numérique','administration numérique','e-gouvernement',
      'services publics numériques','digitalisation','dématérialisation','interopérabilité',
      'registres de référence','état civil','identité numérique','identifiant numérique',
      'paiements électroniques','gateway de paiement','guichet unique','patrimoine informationnel',
      'données publiques','gouvernance des données','zéro papier','digital transformation','e-government',
      'digital government','digital public services','digitalization','interoperability','digital identity',
      'civil registry','e-services','oneci'
    ],
    2
  ),
  (
    'innovation', 'P3',
    'Écosystème de l''Innovation Technologique',
    'Positionner la Côte d''Ivoire comme hub de l''innovation en Afrique de l''Ouest.',
    false, ARRAY[]::text[],
    ARRAY[
      'innovation','startup','start-up','start-up act','entrepreneuriat','vitib','technopole','technopôle',
      'cité de l''innovation','incubateur','accélérateur','financement de l''innovation',
      'fonds de soutien à l''innovation','levée de fonds','écosystème d''innovation','incubator',
      'accelerator','venture capital','funding','fundraising','technology park','tech ecosystem'
    ],
    3
  ),
  (
    'intelligence-artificielle', 'P4',
    'Intelligence Artificielle Nationale',
    'Bâtir les fondations d''un écosystème local d''intelligence artificielle.',
    false, ARRAY[]::text[],
    ARRAY[
      'intelligence artificielle','ia','ia nationale','ia générative','cas d''usage ia','éthique de l''ia',
      'souveraineté numérique','cloud souverain','apprentissage automatique','données','calcul',
      'artificial intelligence','generative ai','machine learning','large language model','openai',
      'anthropic','nvidia','mistral','deepmind','huawei'
    ],
    4
  ),
  (
    'cybersecurite-confiance', 'P5',
    'Cybersécurité & Confiance Numérique',
    'Sécuriser le cyberespace national et développer la confiance numérique.',
    false, ARRAY[]::text[],
    ARRAY[
      'cybersécurité','cyberattaque','cybermenace','cybercriminalité','cyberespace','confiance numérique',
      'sécurité numérique','certification','signature électronique','infrastructures critiques','anssi',
      'cert','protection des données','cybersecurity','cyberattack','cyber threat','cybercrime','ransomware',
      'data breach','trust services','phishing'
    ],
    5
  ),
  (
    'competences-inclusion', 'P6',
    'Compétences Numériques & Inclusion',
    'Développer un capital humain numérique et réduire la fracture numérique.',
    true,
    ARRAY['Mettre en œuvre un programme national d''inclusion numérique'],
    ARRAY[
      'compétences numériques','formation numérique','inclusion numérique','fracture numérique',
      'illectronisme','formation en ligne','littératie numérique','reconversion','montée en compétences',
      'esatic','talents numériques','inclusion financière','digital skills','digital literacy',
      'digital inclusion','digital divide','e-learning','upskilling','reskilling'
    ],
    6
  ),
  (
    'ecommerce-poste', 'P7',
    'E-commerce & Transformation Postale',
    'Redynamiser La Poste et développer le commerce électronique.',
    false, ARRAY[]::text[],
    ARRAY[
      'e-commerce','commerce électronique','la poste','poste','services postaux','corridors postaux',
      'colis','courrier','logistique','paiement en ligne','postal services','parcel','logistics','last mile'
    ],
    7
  )
ON CONFLICT (id) DO NOTHING;

-- 3. Colonnes d'alignement sur les actualités ---------------------------------

ALTER TABLE public.actualites
  ADD COLUMN IF NOT EXISTS pilier_id       text,          -- pilier principal impacté
  ADD COLUMN IF NOT EXISTS piliers         text[] NOT NULL DEFAULT '{}', -- tous les piliers impactés
  ADD COLUMN IF NOT EXISTS action_suggeree text,          -- action recommandée (enrichissement IA)
  ADD COLUMN IF NOT EXISTS confiance_ia    integer;        -- confiance de l'analyse (0-100)

CREATE INDEX IF NOT EXISTS idx_actualites_pilier ON public.actualites(pilier_id);
