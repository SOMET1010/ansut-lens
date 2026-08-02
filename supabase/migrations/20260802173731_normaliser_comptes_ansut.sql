-- =============================================================================
-- Normalisation des comptes officiels de l'ANSUT
--
-- Handles confirmés depuis la page Facebook officielle (section Réseaux sociaux) :
--   X        : ANSUT_CI            (x.com/ANSUT_CI)
--   LinkedIn : ansut               (linkedin.com/company/ansut)
--   Facebook : ansutci             (facebook.com/ansutci)
--   YouTube  : ansuttvofficiel2060 (youtube.com/@ansuttvofficiel2060)
--
-- Corrige deux erreurs : le faux handle X « ansaboroko » et l'amorçage Facebook
-- erroné « ansutegouv » (le bon « ansutci » existait déjà). Ajoute YouTube.
-- Idempotent : les insertions ne créent pas de doublon.
-- =============================================================================

-- X : garantir le bon compte, retirer le faux handle.
INSERT INTO public.vip_comptes (nom, fonction, plateforme, identifiant, url_profil, actif)
SELECT 'ANSUT', 'Compte officiel ANSUT', 'twitter', 'ANSUT_CI', 'https://x.com/ANSUT_CI', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.vip_comptes
  WHERE lower(plateforme) = 'twitter' AND lower(identifiant) = 'ansut_ci'
);
DELETE FROM public.vip_comptes
WHERE lower(plateforme) = 'twitter' AND lower(identifiant) = 'ansaboroko';

-- Facebook : URL canonique sur le bon compte, suppression de l'amorçage erroné.
UPDATE public.vip_comptes
SET url_profil = 'https://www.facebook.com/ansutci'
WHERE lower(plateforme) = 'facebook' AND lower(identifiant) = 'ansutci';
DELETE FROM public.vip_comptes
WHERE lower(plateforme) = 'facebook' AND lower(identifiant) = 'ansutegouv';

-- YouTube : ajouter la chaîne officielle si absente.
INSERT INTO public.vip_comptes (nom, fonction, plateforme, identifiant, url_profil, actif)
SELECT 'ANSUT', 'Compte officiel ANSUT', 'youtube', 'ansuttvofficiel2060',
       'https://www.youtube.com/@ansuttvofficiel2060', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.vip_comptes
  WHERE lower(plateforme) = 'youtube' AND lower(identifiant) = 'ansuttvofficiel2060'
);
