-- DIAGNOSTIC (LECTURE SEULE) des dates de publication probablement fabriquees.
--
-- Objectif : LISTER, sans rien modifier, les publications reseaux dont la date
-- vient tres probablement d'une mention relative convertie au scraping
-- (« il y a 2 heures »), et qui font donc passer un contenu ancien pour recent.
--
-- IMPORTANT :
--   * Ce script NE MODIFIE AUCUNE DONNEE. Il ne fait que des SELECT.
--   * On ne supprime jamais une date sur la seule proximite temporelle : cette
--     liste est un point de depart a VALIDER humainement.
--   * L'UPDATE de nettoyage sera fourni SEPAREMENT, apres validation, et ciblera
--     des identifiants EXPLICITES (jamais une regle large automatique).
--
-- A executer dans l'editeur SQL Lovable/Supabase.
-- NB : ce diagnostic n'utilise QUE des colonnes deja presentes ; il fonctionne
-- meme si la migration de provenance n'a pas encore ete appliquee.

-- 1) Vue d'ensemble : combien de publications, combien datees.
select
  count(*)                                          as total,
  count(date_publication)                           as avec_date,
  count(*) filter (where date_publication is null)  as sans_date
from public.publications_institutionnelles;

-- 2) Lignes SUSPECTES a examiner : publications reseaux dont la date de
--    publication est tres proche de la date de collecte (signe d'une date
--    derivee d'une mention relative). On affiche le contexte pour decider.
--    La colonne marqueur_evenement aide a reperer les contenus qui evoquent un
--    evenement (sport, ceremonie) potentiellement ancien.
select
  id,
  plateforme,
  left(coalesce(contenu, ''), 90)                                        as extrait,
  date_publication,
  created_at                                                            as collecte_le,
  round(extract(epoch from (date_publication - created_at)) / 86400.0, 1) as ecart_jours,
  (lower(coalesce(contenu, '')) ~
    '(football|fanzone|fan zone|champion|coupe|trophee|elephants|felicitation|gitex|ceremonie)')
                                                                        as marqueur_evenement
from public.publications_institutionnelles
where date_publication is not null
  and lower(plateforme) in ('youtube', 'facebook', 'instagram', 'x', 'twitter', 'linkedin', 'tiktok')
  -- Date a moins de 3 jours de la collecte : candidate a une derivation relative.
  and abs(extract(epoch from (date_publication - created_at))) < 3 * 86400
order by marqueur_evenement desc nulls last, ecart_jours asc
limit 200;

-- 3) Une fois la liste ci-dessus validee par un humain, le nettoyage se fera
--    par identifiants EXPLICITES, par exemple (NE PAS EXECUTER TEL QUEL) :
--
--    update public.publications_institutionnelles
--    set date_publication = null,
--        publication_date_source = 'relative_text',
--        publication_date_verified = false
--    where id in ('<uuid-1>', '<uuid-2>', ...);   -- ids valides uniquement
--
--    (Cet UPDATE sera fourni separement, apres votre validation de la liste.)
