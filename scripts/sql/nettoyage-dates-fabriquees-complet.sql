-- Nettoyage COMPLET et SUR des dates de publication fabriquees.
--
-- Regle de ciblage : date_publication IDENTIQUE (a moins de 2 minutes) a la date
-- de collecte (created_at). C'est une PREUVE de fabrication : la date avait ete
-- fixee = instant du scraping. Une vraie date de publication (date calendaire lue
-- sur la page) ne coincide jamais a la seconde pres avec l'instant de collecte.
--
-- Ce n'est PAS la regle large "meme jour" (dangereuse) : un contenu reellement
-- publie puis collecte le meme jour a un ecart de plusieurs heures, donc NON
-- touche par le seuil de 2 minutes.
--
-- On ne supprime pas les contenus : on remet seulement date_publication a null
-- (date d'origine non verifiee), ce qui les exclut des fenetres temporelles.

-- APERCU (lecture seule) : ce qui sera nettoye.
select 'publications' as source, id, plateforme as origine,
       left(coalesce(contenu, ''), 70) as extrait, date_publication, created_at
from public.publications_institutionnelles
where date_publication is not null
  and abs(extract(epoch from (date_publication - created_at))) < 120
union all
select 'actualites', id, source_nom,
       left(coalesce(contenu, ''), 70), date_publication, created_at
from public.actualites
where source_type = 'institutionnel'
  and date_publication is not null
  and abs(extract(epoch from (date_publication - created_at))) < 120
order by 1;

-- NETTOYAGE.
update public.publications_institutionnelles
set date_publication = null,
    publication_date_source = 'relative_text',
    publication_date_verified = false
where date_publication is not null
  and abs(extract(epoch from (date_publication - created_at))) < 120;

update public.actualites
set date_publication = null
where source_type = 'institutionnel'
  and date_publication is not null
  and abs(extract(epoch from (date_publication - created_at))) < 120;
