-- =============================================================================
-- Enregistrement des comptes officiels de l'ANSUT
--
-- Le diagnostic « 0 compte actif » révélait que la voix de l'ANSUT n'était pas
-- collectée faute de comptes enregistrés. On amorce ici les comptes officiels
-- publics confirmés (X et LinkedIn) pour que `collecte-institutionnelle` ait une
-- source. Le champ `fonction` contient « officiel » afin que les publications
-- soient marquées `est_officiel = true`.
--
-- Idempotent : n'insère un compte que s'il n'existe pas déjà (même plateforme +
-- même identifiant). Facebook n'est pas amorcé ici (URL publique non confirmée) ;
-- à ajouter via Réglages → « Veille discrète des dirigeants » avec l'URL exacte.
-- =============================================================================

INSERT INTO public.vip_comptes (nom, fonction, plateforme, identifiant, url_profil, actif)
SELECT v.nom, v.fonction, v.plateforme, v.identifiant, v.url_profil, true
FROM (
  VALUES
    ('ANSUT', 'Compte officiel ANSUT', 'twitter', 'ANSUT_CI', 'https://x.com/ANSUT_CI'),
    ('ANSUT', 'Compte officiel ANSUT', 'linkedin', 'ansut', 'https://www.linkedin.com/company/ansut')
) AS v(nom, fonction, plateforme, identifiant, url_profil)
WHERE NOT EXISTS (
  SELECT 1 FROM public.vip_comptes e
  WHERE lower(e.plateforme) = lower(v.plateforme)
    AND lower(e.identifiant) = lower(v.identifiant)
);
