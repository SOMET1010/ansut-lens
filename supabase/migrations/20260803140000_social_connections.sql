-- =============================================================================
-- Connecteurs sociaux officiels — stockage sécurisé des jetons OAuth.
-- =============================================================================
-- Réf. : docs/CONNECTEURS_SOCIAUX_OFFICIELS.md
--
-- SÉCURITÉ : cette table contient des JETONS d'accès. Elle n'est JAMAIS lisible
-- depuis le front. RLS activée SANS aucune policy pour authenticated/anon → seul
-- le service_role (Edge Functions) y accède (il contourne la RLS). Le statut de
-- connexion (sans jeton) sera exposé au front par une Edge Function dédiée.
-- =============================================================================

create table if not exists public.social_connections (
  id uuid primary key default gen_random_uuid(),

  plateforme      text not null,           -- 'linkedin' | 'facebook' | 'x' | 'youtube'
  org_identifier  text,                     -- URN LinkedIn / Page ID Facebook / etc.
  display_name    text,

  -- Jetons — jamais exposés au navigateur.
  access_token    text not null,
  refresh_token   text,
  token_expires_at timestamptz,
  scope           text,

  statut          text not null default 'connected',  -- connected | expired | error | revoked
  connected_by    uuid,                     -- auth.uid() de l'admin ayant autorisé
  connected_at    timestamptz not null default now(),
  last_sync_at    timestamptz,
  last_error      text,
  meta            jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint social_connections_plateforme_chk
    check (plateforme in ('linkedin', 'facebook', 'x', 'youtube', 'instagram', 'tiktok')),
  constraint social_connections_statut_chk
    check (statut in ('connected', 'expired', 'error', 'revoked')),
  constraint social_connections_unique unique (plateforme, org_identifier)
);

create index if not exists idx_social_connections_plateforme on public.social_connections(plateforme);
create index if not exists idx_social_connections_statut on public.social_connections(statut);

-- updated_at automatique.
create or replace function public.touch_social_connections()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_social_connections on public.social_connections;
create trigger trg_touch_social_connections
  before update on public.social_connections
  for each row execute function public.touch_social_connections();

-- RLS : activée, AUCUNE policy pour le front. Les jetons ne sont accessibles
-- qu'au service_role (Edge Functions), qui contourne la RLS.
alter table public.social_connections enable row level security;

comment on table public.social_connections is
  'Jetons OAuth des connecteurs sociaux officiels. SERVER-ONLY : jamais lisible depuis le front (RLS sans policy authenticated). Accès réservé au service_role via Edge Functions.';
comment on column public.social_connections.access_token is
  'Jeton d''accès — SECRET. Ne jamais exposer au navigateur ni logguer.';
