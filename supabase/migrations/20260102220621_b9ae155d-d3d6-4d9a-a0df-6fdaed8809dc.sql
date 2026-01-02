-- =====================================================
-- LOT 3 : Contraintes CHECK (avec suppression préalable si existantes)
-- =====================================================

-- Supprimer les contraintes existantes si elles existent
ALTER TABLE public.personnalites DROP CONSTRAINT IF EXISTS personnalites_cercle_check;
ALTER TABLE public.personnalites DROP CONSTRAINT IF EXISTS personnalites_niveau_alerte_check;
ALTER TABLE public.personnalites DROP CONSTRAINT IF EXISTS personnalites_tendance_spdi_check;
ALTER TABLE public.personnalites DROP CONSTRAINT IF EXISTS personnalites_categorie_check;
ALTER TABLE public.personnalites DROP CONSTRAINT IF EXISTS personnalites_score_influence_check;
ALTER TABLE public.signaux DROP CONSTRAINT IF EXISTS signaux_niveau_check;
ALTER TABLE public.signaux DROP CONSTRAINT IF EXISTS signaux_quadrant_check;
ALTER TABLE public.alertes DROP CONSTRAINT IF EXISTS alertes_niveau_check;
ALTER TABLE public.dossiers DROP CONSTRAINT IF EXISTS dossiers_statut_check;
ALTER TABLE public.dossiers DROP CONSTRAINT IF EXISTS dossiers_categorie_check;
ALTER TABLE public.actualites DROP CONSTRAINT IF EXISTS actualites_importance_check;
ALTER TABLE public.presence_digitale_recommandations DROP CONSTRAINT IF EXISTS recommandations_priorite_check;

-- 1. Personnalités : cercle stratégique (1 à 4)
ALTER TABLE public.personnalites 
ADD CONSTRAINT personnalites_cercle_check 
CHECK (cercle IS NULL OR cercle BETWEEN 1 AND 4);

-- 2. Personnalités : niveau d'alerte
ALTER TABLE public.personnalites 
ADD CONSTRAINT personnalites_niveau_alerte_check 
CHECK (niveau_alerte IS NULL OR niveau_alerte IN ('normal', 'eleve', 'critique'));

-- 3. Personnalités : tendance SPDI
ALTER TABLE public.personnalites 
ADD CONSTRAINT personnalites_tendance_spdi_check 
CHECK (tendance_spdi IS NULL OR tendance_spdi IN ('up', 'down', 'stable'));

-- 4. Personnalités : catégorie d'acteur
ALTER TABLE public.personnalites 
ADD CONSTRAINT personnalites_categorie_check 
CHECK (categorie IS NULL OR categorie IN ('operateur', 'regulateur', 'expert', 'politique', 'media', 'bailleur', 'fai', 'fintech', 'autre'));

-- 5. Personnalités : score d'influence (0-100)
ALTER TABLE public.personnalites 
ADD CONSTRAINT personnalites_score_influence_check 
CHECK (score_influence IS NULL OR score_influence BETWEEN 0 AND 100);

-- 6. Signaux : niveau
ALTER TABLE public.signaux 
ADD CONSTRAINT signaux_niveau_check 
CHECK (niveau IN ('info', 'warning', 'critical'));

-- 7. Signaux : quadrant
ALTER TABLE public.signaux 
ADD CONSTRAINT signaux_quadrant_check 
CHECK (quadrant IN ('tech', 'regulation', 'market', 'reputation'));

-- 8. Alertes : niveau
ALTER TABLE public.alertes 
ADD CONSTRAINT alertes_niveau_check 
CHECK (niveau IN ('info', 'warning', 'critical'));

-- 9. Dossiers : statut
ALTER TABLE public.dossiers 
ADD CONSTRAINT dossiers_statut_check 
CHECK (statut IN ('brouillon', 'publie', 'archive'));

-- 10. Dossiers : catégorie
ALTER TABLE public.dossiers 
ADD CONSTRAINT dossiers_categorie_check 
CHECK (categorie IN ('general', 'technique', 'strategique', 'operationnel'));

-- 11. Actualités : importance (0-100)
ALTER TABLE public.actualites 
ADD CONSTRAINT actualites_importance_check 
CHECK (importance IS NULL OR importance BETWEEN 0 AND 100);

-- 12. Recommandations SPDI : priorité
ALTER TABLE public.presence_digitale_recommandations 
ADD CONSTRAINT recommandations_priorite_check 
CHECK (priorite IS NULL OR priorite IN ('haute', 'normale', 'basse'));