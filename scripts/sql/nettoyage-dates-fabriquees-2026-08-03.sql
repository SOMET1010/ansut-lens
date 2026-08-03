-- Nettoyage CIBLE des dates de publication fabriquees (validation du 2026-08-03).
--
-- Contexte : diagnostic (scripts/sql/diagnostic-dates-suspectes.sql) => 3 posts
-- YouTube dont date_publication == date de collecte (ecart 0,0 j), donc dates
-- derivees d'une mention relative au scraping. Contenus : celebration des
-- champions d'Ebimpe, application Digital Fanzone (x2). Evenements anciens
-- presentes comme communication recente.
--
-- On ne supprime PAS le contenu (ce sont de vraies communications) : on remet
-- seulement la date de publication a null (date d'origine non verifiee), ce qui
-- les exclut des fenetres temporelles sans les rendre inaccessibles.
--
-- Cible : identifiants EXPLICITES uniquement (jamais une regle large).

update public.publications_institutionnelles
set date_publication = null
where id in (
  '7a6203d9-c061-4d6a-9844-1f5ce3989747',  -- Felicitations champions d'Ebimpe
  '6ed09c02-e5da-4ac9-aad8-eb22f83a26e4',  -- Digital Fanzone
  '07a4008e-513b-4686-8e59-a3cbfdc1eb6c'   -- Digital Fanzone
);

-- Copie pontee dans actualites (meme fausse date, ecart 0,0 j) : champions d'Ebimpe.
update public.actualites
set date_publication = null
where id = '1ea5330c-75ff-4361-beb4-9c4cb64bcd45';

-- A executer UNIQUEMENT si la migration de provenance est appliquee :
-- update public.publications_institutionnelles
-- set publication_date_source = 'relative_text', publication_date_verified = false
-- where id in (
--   '7a6203d9-c061-4d6a-9844-1f5ce3989747',
--   '6ed09c02-e5da-4ac9-aad8-eb22f83a26e4',
--   '07a4008e-513b-4686-8e59-a3cbfdc1eb6c'
-- );
