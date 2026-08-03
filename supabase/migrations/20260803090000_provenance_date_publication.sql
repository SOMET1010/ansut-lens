-- Provenance de la date de publication (deux temporalites + datation fiable).
--
-- On conserve durablement D'OU vient la date de publication d'un contenu, afin
-- que le pipeline distingue une date fiable d'une date estimee ou inconnue.
-- La fraicheur editoriale ne doit s'appuyer que sur une date fiable ;
-- une date issue d'une mention relative n'est pas une date de publication.
--
-- A appliquer AVANT le deploiement de la nouvelle fonction collecte-institutionnelle.

alter table public.publications_institutionnelles
  add column if not exists publication_date_source text not null default 'unknown',
  add column if not exists publication_date_verified boolean not null default false;

-- Valeurs autorisees de provenance :
--   absolute_source   : date absolue explicite lue dans le contenu
--   platform_metadata : date fournie par la plateforme (metadonnee structuree)
--   relative_text     : seule une mention relative existait (non fiable)
--   inferred          : date deduite (non verifiee)
--   unknown           : aucune date exploitable
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'publications_inst_date_source_check'
  ) then
    alter table public.publications_institutionnelles
      add constraint publications_inst_date_source_check
      check (publication_date_source in (
        'absolute_source', 'platform_metadata', 'relative_text', 'inferred', 'unknown'
      ));
  end if;
end $$;

comment on column public.publications_institutionnelles.publication_date_source is
  'Provenance de date_publication : absolute_source | platform_metadata | relative_text | inferred | unknown';
comment on column public.publications_institutionnelles.publication_date_verified is
  'La date de publication est-elle fiable (date absolue explicite ou metadonnee plateforme) ?';
