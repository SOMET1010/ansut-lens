-- =============================================================================
-- ÉTAGE 2 du pipeline éditorial — qualification unique et persistée.
-- =============================================================================
-- Contrat : docs/PIPELINE_EDITORIAL.md · Conception : docs/etage2-schema-
-- qualification-editoriale.md (décisions validées : Option B, content_key + FKs
-- typées, nommage approuvé).
--
-- OPTION B : on persiste les FAITS éditoriaux STABLES. Les éligibilités
-- (fraîcheur fenêtrée incluse) sont DÉRIVÉES par un service de politiques
-- versionné côté application (politiquesEditoriales.ts), JAMAIS figées en base —
-- un booléen « récent » deviendrait faux le lendemain (anti-Charte).
--
-- Additive et isolée : rollback = `drop table editorial_qualifications;`,
-- ZÉRO perte sur les contenus (aucune colonne source modifiée).
-- =============================================================================

create table if not exists public.editorial_qualifications (
  id uuid primary key default gen_random_uuid(),

  -- Identité de contenu UNIQUE : une qualification par contenu réel, même s'il
  -- existe dans deux tables (pont publications_institutionnelles → actualites).
  -- content_key = URL canonique normalisée, sinon 'hash:'||md5(texte normalisé).
  content_key text not null unique,

  -- Rattachements typés (au moins un). Cascade : la qualification disparaît avec
  -- le contenu qu'elle décrit.
  publication_id uuid references public.publications_institutionnelles(id) on delete cascade,
  actualite_id  uuid references public.actualites(id) on delete cascade,

  -- Datation (faits, repris de la provenance déjà en base — jamais recalculés).
  editorial_date timestamptz,
  date_verified  boolean not null default false,
  date_source    text    not null default 'unknown',

  -- Classification (faits déterministes : qualificationContenu.ts).
  category         text    not null default 'autre',
  primary_theme    text,
  secondary_themes text[]  not null default '{}',
  is_institutional boolean not null default false,
  is_ansut_voice   boolean not null default false,

  -- Traçabilité (test du DG) : mots-clés/règles déclencheurs, provenance, limites.
  evidence    jsonb  not null default '{}'::jsonb,
  limitations text[] not null default '{}',

  -- Versionnement & méthode (déterministe = étage 2 ; ai = étage 4).
  qualification_method text    not null default 'deterministic',
  rules_version        integer not null default 1,
  ai_version           integer,
  qualified_at         timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint editorial_qual_rattachement_chk
    check (publication_id is not null or actualite_id is not null),
  constraint editorial_qual_category_chk
    check (category in (
      'institutionnelle','programme','evenementielle','communautaire',
      'promotionnelle','protocolaire','sportive','autre'
    )),
  constraint editorial_qual_date_source_chk
    check (date_source in (
      'absolute_source','platform_metadata','relative_text','inferred','unknown'
    )),
  constraint editorial_qual_method_chk
    check (qualification_method in ('deterministic','ai','hybrid'))
);

-- Index de lecture (les vues filtrent par ces axes).
create index if not exists idx_editorial_qual_publication on public.editorial_qualifications(publication_id);
create index if not exists idx_editorial_qual_actualite   on public.editorial_qualifications(actualite_id);
create index if not exists idx_editorial_qual_date        on public.editorial_qualifications(editorial_date);
create index if not exists idx_editorial_qual_voice_ver   on public.editorial_qualifications(is_ansut_voice, date_verified);
create index if not exists idx_editorial_qual_category    on public.editorial_qualifications(category);
create index if not exists idx_editorial_qual_themes      on public.editorial_qualifications using gin(secondary_themes);
create index if not exists idx_editorial_qual_rules_ver   on public.editorial_qualifications(rules_version);

-- updated_at automatique.
create or replace function public.touch_editorial_qualifications()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_editorial_qualifications on public.editorial_qualifications;
create trigger trg_touch_editorial_qualifications
  before update on public.editorial_qualifications
  for each row execute function public.touch_editorial_qualifications();

-- RLS alignée sur les tables de contenu :
--   lecture = tout utilisateur authentifié ; écriture = pipeline (service role) ;
--   gestion = admin.
alter table public.editorial_qualifications enable row level security;

drop policy if exists "Authenticated can view editorial_qualifications" on public.editorial_qualifications;
create policy "Authenticated can view editorial_qualifications"
  on public.editorial_qualifications for select to authenticated
  using (true);

drop policy if exists "Service can write editorial_qualifications" on public.editorial_qualifications;
create policy "Service can write editorial_qualifications"
  on public.editorial_qualifications for all to service_role
  using (true) with check (true);

drop policy if exists "Admins can manage editorial_qualifications" on public.editorial_qualifications;
create policy "Admins can manage editorial_qualifications"
  on public.editorial_qualifications for all
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

comment on table public.editorial_qualifications is
  'Étage 2 du pipeline éditorial : qualification unique par contenu (Option B — faits persistés, éligibilités dérivées). Clé métier : content_key.';
comment on column public.editorial_qualifications.content_key is
  'Identité de contenu unique (URL canonique normalisée, sinon hash du texte) — dédoublonne un contenu présent dans plusieurs tables.';
comment on column public.editorial_qualifications.rules_version is
  'Version des règles déterministes ayant produit cette qualification ; requalifier si < version courante.';
