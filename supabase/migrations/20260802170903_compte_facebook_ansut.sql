-- =============================================================================
-- Compte Facebook officiel de l'ANSUT
--
-- Complète l'amorçage des comptes officiels avec la page Facebook fournie. Le
-- lien est un lien de partage Facebook (redirection) : Firecrawl suit les
-- redirections lors de la collecte. Si la page canonique est connue plus tard
-- (facebook.com/<nom>), remplacer `url_profil` en admin.
-- Idempotent : n'insère pas de doublon.
-- =============================================================================

INSERT INTO public.vip_comptes (nom, fonction, plateforme, identifiant, url_profil, actif)
SELECT 'ANSUT', 'Compte officiel ANSUT', 'facebook', 'ansutegouv',
       'https://www.facebook.com/share/18EXSNZ73F/', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.vip_comptes e
  WHERE lower(e.plateforme) = 'facebook'
    AND lower(e.identifiant) = 'ansutegouv'
);
