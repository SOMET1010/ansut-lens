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
--
-- Dépendances explicites (déjà présentes, utilisées par d'autres tables du
-- projet) : la fonction public.update_updated_at_column(), le type app_role et
-- la fonction public.has_role(uuid, app_role). Un préambule les vérifie et
-- échoue tôt avec un message clair si l'une manque.
-- =============================================================================

-- 0) Préambule : vérifier les dépendances avant toute création ---------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    RAISE EXCEPTION 'Dépendance manquante : type public.app_role (créé par les migrations rôles).';
  END IF;
  IF to_regprocedure('public.update_updated_at_column()') IS NULL THEN
    RAISE EXCEPTION 'Dépendance manquante : fonction public.update_updated_at_column().';
  END IF;
  IF to_regprocedure('public.has_role(uuid, app_role)') IS NULL THEN
    RAISE EXCEPTION 'Dépendance manquante : fonction public.has_role(uuid, app_role).';
  END IF;
END $$;

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
  -- Dénormalisation TRANSITOIRE. La représentation canonique d'une direction
  -- responsable est une entité `direction` reliée via une relation
  -- `responsable_de` (voir strategic_relations). Cette colonne texte sera
  -- retirée quand les directions seront saisies comme entités.
  direction_responsable text,
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
  type_relation text NOT NULL DEFAULT 'contient',
  validation    text NOT NULL DEFAULT 'a_valider',   -- une relation peut être « supposée »
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT strategic_relations_type_chk
    CHECK (type_relation IN ('contient','porte','responsable_de','partenaire_de','contribue_a')),
  CONSTRAINT strategic_relations_validation_chk
    CHECK (validation IN ('a_valider','valide','suppose','rejete')),
  CONSTRAINT strategic_relations_no_self_chk CHECK (parent_id <> enfant_id),
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

-- Intégrité de la preuve polymorphe : `knowledge_evidence` pointe une entité,
-- une relation ou un indicateur via (cible_type, cible_id). Une FK classique est
-- impossible (cible polymorphe) ; un trigger garantit que la cible existe bien
-- dans la table correspondante, et refuse l'insertion sinon.
CREATE OR REPLACE FUNCTION public.check_knowledge_evidence_cible()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.cible_type = 'entity' THEN
    IF NOT EXISTS (SELECT 1 FROM public.strategic_entities WHERE id = NEW.cible_id) THEN
      RAISE EXCEPTION 'knowledge_evidence : entité cible % introuvable', NEW.cible_id;
    END IF;
  ELSIF NEW.cible_type = 'relation' THEN
    IF NOT EXISTS (SELECT 1 FROM public.strategic_relations WHERE id = NEW.cible_id) THEN
      RAISE EXCEPTION 'knowledge_evidence : relation cible % introuvable', NEW.cible_id;
    END IF;
  ELSIF NEW.cible_type = 'indicator' THEN
    IF NOT EXISTS (SELECT 1 FROM public.strategic_indicators WHERE id = NEW.cible_id) THEN
      RAISE EXCEPTION 'knowledge_evidence : indicateur cible % introuvable', NEW.cible_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_knowledge_evidence_cible ON public.knowledge_evidence;
CREATE TRIGGER trg_check_knowledge_evidence_cible
  BEFORE INSERT OR UPDATE ON public.knowledge_evidence
  FOR EACH ROW EXECUTE FUNCTION public.check_knowledge_evidence_cible();

-- RLS : accès RÉSERVÉ AUX ADMINS pendant la phase brouillon -----------------
-- Tant que la connaissance n'est pas revue/validée, il ne serait pas correct de
-- l'exposer en lecture à tous les utilisateurs authentifiés : ce sont des
-- données EXTRAITES, non validées, et potentiellement sensibles. On restreint
-- donc lecture ET écriture aux admins. Une fois la base validée et branchée sur
-- « Ce matin », on ajoutera une policy de lecture élargie (authenticated, ou des
-- rôles précis) — décision à prendre explicitement à ce moment-là.
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
    -- Retire une éventuelle policy de lecture large héritée d'une version antérieure.
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated read %1$s" ON public.%1$I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins manage %1$s" ON public.%1$I;', t);
    EXECUTE format(
      'CREATE POLICY "Admins manage %1$s" ON public.%1$I FOR ALL TO authenticated '
      'USING (has_role(auth.uid(), ''admin''::app_role)) '
      'WITH CHECK (has_role(auth.uid(), ''admin''::app_role));', t);
  END LOOP;
END $$;
