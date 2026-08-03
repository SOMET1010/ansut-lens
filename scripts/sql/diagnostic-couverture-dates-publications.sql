-- =============================================================================
-- DIAGNOSTIC (lecture seule) — Couverture des dates de publication ANSUT
-- =============================================================================
-- Objectif : comprendre pourquoi « Insights Communication » affiche peu ou pas
-- de publications datées. On ne modifie RIEN ici — on compte seulement.
--
-- Rappel de la règle verrouillée : une publication n'entre dans une fenêtre
-- (7 / 30 / 90 j) QUE si `date_publication` est une date absolue vérifiée.
-- Les posts dont seule une mention relative existait (« il y a 2 j ») ont
-- `date_publication = NULL` : c'est voulu (on ne fabrique plus de date), mais
-- cela vide les Insights si la plupart des posts sont dans ce cas.
-- =============================================================================

-- 1) Vue d'ensemble : datées vs non datées, et fraîcheur des datées.
SELECT
  count(*)                                                          AS total,
  count(*) FILTER (WHERE date_publication IS NOT NULL)              AS datees,
  count(*) FILTER (WHERE date_publication IS NULL)                  AS non_datees,
  count(*) FILTER (WHERE date_publication >= now() - interval '7 days')  AS datees_7j,
  count(*) FILTER (WHERE date_publication >= now() - interval '30 days') AS datees_30j,
  count(*) FILTER (WHERE date_publication >= now() - interval '90 days') AS datees_90j,
  max(date_publication)                                            AS derniere_date_publication
FROM publications_institutionnelles;

-- 2) Répartition par plateforme : où perd-on les dates ?
SELECT
  plateforme,
  count(*)                                                AS total,
  count(*) FILTER (WHERE date_publication IS NOT NULL)    AS datees,
  count(*) FILTER (WHERE date_publication IS NULL)        AS non_datees,
  max(date_publication)                                   AS derniere_date
FROM publications_institutionnelles
GROUP BY plateforme
ORDER BY total DESC;

-- 3) Origine déclarée de la date (si la migration provenance est appliquée).
--    Montre combien de posts n'avaient qu'une date RELATIVE (donc écartée).
--    Si erreur « column does not exist » : la migration provenance n'est pas
--    encore appliquée — ignorez ce bloc, les blocs 1 et 2 suffisent.
SELECT
  publication_date_source,
  publication_date_verified,
  count(*) AS n
FROM publications_institutionnelles
GROUP BY publication_date_source, publication_date_verified
ORDER BY n DESC;

-- 4) Échantillon des 15 publications les plus récemment collectées, pour voir
--    concrètement ce que le scraping a réussi (ou non) à dater.
SELECT
  plateforme,
  left(coalesce(contenu, ''), 70) AS extrait,
  date_publication,
  created_at AS collecte_le
FROM publications_institutionnelles
ORDER BY created_at DESC
LIMIT 15;
