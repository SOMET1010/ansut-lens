-- =============================================================================
-- Base de connaissance institutionnelle de l'ANSUT (schéma)
--
-- Objectif : représenter durablement la stratégie officielle de l'ANSUT —
-- Mission → Axe → Programme → Projet → Objectif → Indicateur — en conservant la
-- PREUVE documentaire derrière chaque élément et une MATURITÉ granulaire.
--
-- Principes verrouillés :
--   - Modèle relationnel (5 tables), pas une table fourre-tout.
--   - Aucun élément n'est « validé » (🟢) sans revue humaine : tout ce qui est
--     extrait d'un document reste « à valider » (🟡) jusqu'à validation.
--   - Pas d'interrupteur global : la validation est portée par CHAQUE élément.
--   - Chaque entité / relation / indicateur peut être adossé à une ou plusieurs
--     preuves (document + localisation + texte d'origine + méthode).
--
-- Cette migration crée UNIQUEMENT le schéma. L'alimentation (seed extrait du
-- plan) est livrée séparément et n'est appliquée qu'après revue humaine.
-- À exécuter dans Cloud → SQL editor (Lovable n'applique pas les migrations).
-- Idempotent (CREATE TABLE IF NOT EXISTS + policies DROP/CREATE).
-- =============================================================================

-- 1) Sources documentaires --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.institutional_sources (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre         text NOT NULL,
  -- plan_strategique | lettre_mission | document_institutionnel | communication | autre
  type          text NOT NULL DEFAULT 'document_institutionnel',
  reference     text,                       -- nom de fichier / URL
  date_document date,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 2) Entités stratégiques (nœuds de la hiérarchie) --------------------------
CREATE TABLE IF NOT EXISTS public.strategic_entities (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- mission | axe | programme | projet | objectif | partenaire | direction
  type                  text NOT NULL,
  code                  text,               -- P1, code projet…
  libelle               text NOT NULL,
  description           text,
  direction_responsable text,               -- dénormalisé ; souvent « à confirmer »
  periode_debut         date,
  periode_fin           date,
  statut                text NOT NULL DEFAULT 'actif',       -- actif | archive
  -- a_valider (🟡 extrait) | valide (🟢 document) | suppose | rejete
  validation            text NOT NULL DEFAULT 'a_valider',
  note_maturite         text,               -- ex. « indicateur incomplet », « partenaire non confirmé »
  validated_by          text,
  validated_at          timestamptz,
  derniere_validation   date,
  ordre                 integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT strategic_entities_type_chk
    CHECK (type IN ('mission','axe','programme','projet','objectif','partenaire','direction')),
  CONSTRAINT strategic_entities_validation_chk
    CHECK (validation IN ('a_valider','valide','suppose','rejete')),
  CONSTRAINT strategic_entities_statut_chk
    CHECK (statut IN ('actif','archive'))
);

-- 3) Relations entre entités (arêtes) ---------------------------------------
CREATE TABLE IF NOT EXISTS public.strategic_relations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id     uuid NOT NULL REFERENCES public.strategic_entities(id) ON DELETE CASCADE,
  enfant_id     uuid NOT NULL REFERENCES public.strategic_entities(id) ON DELETE CASCADE,
  -- contient | porte | responsable_de | partenaire_de | contribue_a
  type_relation text NOT NULL DEFAULT 'contient',
  validation    text NOT NULL DEFAULT 'a_valider',   -- une relation peut être « supposée »
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT strategic_relations_validation_chk
    CHECK (validation IN ('a_valider','valide','suppose','rejete')),
  CONSTRAINT strategic_relations_unique UNIQUE (parent_id, enfant_id, type_relation)
);

-- 4) Indicateurs (KPI rattachés à une entité) -------------------------------
CREATE TABLE IF NOT EXISTS public.strategic_indicators (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       uuid REFERENCES public.strategic_entities(id) ON DELETE CASCADE,
  libelle         text NOT NULL,
  valeur_cible    text,
  valeur_actuelle text,
  unite           text,
  echeance        date,
  -- a_valider | valide | suppose | rejete | incomplet
  validation      text NOT NULL DEFAULT 'a_valider',
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT strategic_indicators_validation_chk
    CHECK (validation IN ('a_valider','valide','suppose','rejete','incomplet'))
);

-- 5) Preuves documentaires (traçabilité de chaque élément) ------------------
CREATE TABLE IF NOT EXISTS public.knowledge_evidence (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id         uuid REFERENCES public.institutional_sources(id) ON DELETE SET NULL,
  cible_type        text NOT NULL,          -- entity | relation | indicator
  cible_id          uuid NOT NULL,
  localisation      text,                   -- ex. « Diapositive 12 »
  texte_origine     text,                   -- verbatim extrait du document
  methode_extraction text NOT NULL DEFAULT 'extraction_assistee', -- extraction_assistee | saisie_manuelle | ocr
  date_document     date,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_evidence_cible_chk
    CHECK (cible_type IN ('entity','relation','indicator'))
);

-- Index ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_strategic_entities_type ON public.strategic_entities(type, ordre);
CREATE INDEX IF NOT EXISTS idx_strategic_entities_validation ON public.strategic_entities(validation);
CREATE INDEX IF NOT EXISTS idx_strategic_relations_parent ON public.strategic_relations(parent_id);
CREATE INDEX IF NOT EXISTS idx_strategic_relations_enfant ON public.strategic_relations(enfant_id);
CREATE INDEX IF NOT EXISTS idx_strategic_indicators_entity ON public.strategic_indicators(entity_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_evidence_cible ON public.knowledge_evidence(cible_type, cible_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_evidence_source ON public.knowledge_evidence(source_id);

-- updated_at auto (fonction déjà présente dans le projet) --------------------
DROP TRIGGER IF EXISTS set_institutional_sources_updated_at ON public.institutional_sources;
CREATE TRIGGER set_institutional_sources_updated_at
  BEFORE UPDATE ON public.institutional_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_strategic_entities_updated_at ON public.strategic_entities;
CREATE TRIGGER set_strategic_entities_updated_at
  BEFORE UPDATE ON public.strategic_entities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_strategic_indicators_updated_at ON public.strategic_indicators;
CREATE TRIGGER set_strategic_indicators_updated_at
  BEFORE UPDATE ON public.strategic_indicators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS : lecture pour les authentifiés, gestion réservée aux admins ----------
ALTER TABLE public.institutional_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategic_entities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategic_relations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategic_indicators  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_evidence    ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'institutional_sources','strategic_entities','strategic_relations',
    'strategic_indicators','knowledge_evidence'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated read %1$s" ON public.%1$I;', t);
    EXECUTE format(
      'CREATE POLICY "Authenticated read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (true);', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins manage %1$s" ON public.%1$I;', t);
    EXECUTE format(
      'CREATE POLICY "Admins manage %1$s" ON public.%1$I FOR ALL TO authenticated '
      'USING (has_role(auth.uid(), ''admin''::app_role)) '
      'WITH CHECK (has_role(auth.uid(), ''admin''::app_role));', t);
  END LOOP;
END $$;
