-- Garde-fou anti « email bombing » sur les endpoints publics d'email
-- (reset-user-password, send-magic-link). Fenêtre glissante atomique en base,
-- partagée entre toutes les instances des edge functions.
-- Audit santé P2 #25.

create table if not exists public.auth_email_throttle (
  cle            text primary key,
  fenetre_debut  timestamptz not null default now(),
  compteur       integer     not null default 0,
  maj_le         timestamptz not null default now()
);

-- Aucune policy → seul le service_role (qui contourne la RLS) accède à la table.
alter table public.auth_email_throttle enable row level security;

-- Incrémente le quota pour `p_cle` dans une fenêtre de `p_fenetre_secondes`
-- et renvoie true si la requête est autorisée, false si le plafond `p_max`
-- est atteint. Opération atomique (SELECT ... FOR UPDATE) pour éviter les
-- courses entre invocations concurrentes.
create or replace function public.consommer_quota_email(
  p_cle text,
  p_max integer,
  p_fenetre_secondes integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_maintenant timestamptz := now();
  v_debut      timestamptz;
  v_compteur   integer;
begin
  -- Garantit l'existence de la ligne avant le verrou.
  insert into public.auth_email_throttle (cle, fenetre_debut, compteur, maj_le)
    values (p_cle, v_maintenant, 0, v_maintenant)
  on conflict (cle) do nothing;

  select fenetre_debut, compteur
    into v_debut, v_compteur
    from public.auth_email_throttle
    where cle = p_cle
    for update;

  -- Fenêtre expirée → on repart de zéro (1re requête de la nouvelle fenêtre).
  if v_debut is null
     or v_maintenant - v_debut > make_interval(secs => p_fenetre_secondes) then
    update public.auth_email_throttle
      set fenetre_debut = v_maintenant, compteur = 1, maj_le = v_maintenant
      where cle = p_cle;
    return true;
  end if;

  -- Plafond atteint dans la fenêtre courante.
  if v_compteur >= p_max then
    return false;
  end if;

  update public.auth_email_throttle
    set compteur = compteur + 1, maj_le = v_maintenant
    where cle = p_cle;
  return true;
end;
$$;

-- Exposition minimale : seul le service_role appelle la fonction depuis les edge functions.
revoke all on function public.consommer_quota_email(text, integer, integer) from public;
revoke all on function public.consommer_quota_email(text, integer, integer) from anon;
revoke all on function public.consommer_quota_email(text, integer, integer) from authenticated;
grant execute on function public.consommer_quota_email(text, integer, integer) to service_role;
