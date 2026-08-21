-- =====================================================================
-- FACTURO — Migration 0027 : garde « dernier administrateur »
-- Empêche de supprimer ou de rétrograder le dernier administrateur
-- actif d'une entreprise tant qu'aucun autre administrateur n'existe.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Helper : existe-t-il un autre administrateur actif dans l'entreprise ?
-- ---------------------------------------------------------------------
create or replace function public.has_other_admin(p_entreprise_id uuid, p_excluded_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where entreprise_id = p_entreprise_id
      and role = 'administrateur'
      and deleted_at is null
      and id is distinct from p_excluded_id
  )
$$;

-- ---------------------------------------------------------------------
-- 2. RPC de changement de rôle avec garde dernier admin
--    (remplace tout update direct de profiles.role côté client)
-- ---------------------------------------------------------------------
create or replace function public.change_profile_role(p_profile_id uuid, p_new_role public.user_role, p_by uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entreprise_id uuid;
  v_role public.user_role;
  v_deleted_at timestamptz;
begin
  select entreprise_id, role, deleted_at into v_entreprise_id, v_role, v_deleted_at
  from public.profiles
  where id = p_profile_id;

  if not found then
    raise exception 'Utilisateur introuvable';
  end if;

  if v_deleted_at is not null then
    raise exception 'Utilisateur supprimé : modification impossible';
  end if;

  if not public.is_super_admin() then
    if not exists (
      select 1 from public.profiles
      where id = p_by
      and entreprise_id = v_entreprise_id
      and role = 'administrateur'
      and deleted_at is null
    ) then
      raise exception 'Accès refusé : seul l''administrateur de l''entreprise ou super_admin peut modifier un rôle';
    end if;
  end if;

  if v_role = 'super_admin' then
    raise exception 'Impossible de modifier un super_admin';
  end if;

  if v_role = 'administrateur' and p_new_role <> 'administrateur'
     and not public.has_other_admin(v_entreprise_id, p_profile_id) then
    raise exception 'Impossible de retirer son rôle au dernier administrateur de l''entreprise';
  end if;

  update public.profiles set role = p_new_role where id = p_profile_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Garde dans hard_delete_user (recréée)
-- ---------------------------------------------------------------------
create or replace function public.hard_delete_user(p_profile_id uuid, p_deleted_by uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_entreprise_id uuid;
  v_role public.user_role;
  v_deleted_at timestamptz;
begin
  select id, entreprise_id, role, deleted_at into v_user_id, v_entreprise_id, v_role, v_deleted_at
  from public.profiles
  where id = p_profile_id;

  if v_user_id is null then
    raise exception 'Utilisateur introuvable';
  end if;

  if not public.is_super_admin() then
    if not exists (
      select 1 from public.profiles
      where id = p_deleted_by
      and entreprise_id = v_entreprise_id
      and role = 'administrateur'
    ) then
      raise exception 'Accès refusé : seul l''administrateur de l''entreprise ou super_admin peut supprimer';
    end if;
  end if;

  if p_profile_id = p_deleted_by then
    raise exception 'Impossible de supprimer son propre compte';
  end if;

  if v_role = 'super_admin' then
    raise exception 'Impossible de supprimer un super_admin';
  end if;

  if v_role = 'administrateur' and v_deleted_at is null
     and not public.has_other_admin(v_entreprise_id, p_profile_id) then
    raise exception 'Impossible de supprimer le dernier administrateur de l''entreprise';
  end if;

  delete from auth.users where id = v_user_id;
  delete from public.profiles where id = p_profile_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Garde dans soft_delete_user (recréée)
-- ---------------------------------------------------------------------
create or replace function public.soft_delete_user(p_profile_id uuid, p_deleted_by uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entreprise_id uuid;
  v_role public.user_role;
  v_deleted_at timestamptz;
begin
  select entreprise_id, role, deleted_at into v_entreprise_id, v_role, v_deleted_at
  from public.profiles
  where id = p_profile_id;

  if not found then
    raise exception 'Utilisateur introuvable';
  end if;

  if not public.is_super_admin() then
    if not exists (
      select 1 from public.profiles
      where id = p_deleted_by
      and entreprise_id = public.current_entreprise_id()
      and public.current_role() = 'administrateur'
    ) then
      raise exception 'Accès refusé : seul l''administrateur de l''entreprise ou super_admin peut supprimer';
    end if;
  end if;

  if p_profile_id = p_deleted_by then
    raise exception 'Impossible de supprimer son propre compte';
  end if;

  if v_role = 'super_admin' then
    raise exception 'Impossible de supprimer un super_admin';
  end if;

  if v_role = 'administrateur' and v_deleted_at is null
     and not public.has_other_admin(v_entreprise_id, p_profile_id) then
    raise exception 'Impossible de supprimer le dernier administrateur de l''entreprise';
  end if;

  update public.profiles
  set deleted_at = now(), deleted_by = p_deleted_by
  where id = p_profile_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Renforcement RLS UPDATE sur profiles (zero-trust)
--    Toute mise à jour menant à une entreprise sans administrateur est
--    rejetée, quel que soit le client.
-- ---------------------------------------------------------------------
drop policy if exists "admin gere les profils de son entreprise" on public.profiles;
create policy "admin gere les profils de son entreprise" on public.profiles
  for update using (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() = 'administrateur'
    and deleted_at is null
  ) with check (
    entreprise_id = public.current_entreprise_id()
    and deleted_at is null
    and (role = 'administrateur' or public.has_other_admin(entreprise_id, id))
  );

drop policy if exists "utilisateur modifie son propre profil" on public.profiles;
create policy "utilisateur modifie son propre profil" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and (role = 'administrateur' or public.has_other_admin(entreprise_id, id)));

-- ---------------------------------------------------------------------
-- 6. Documentation
-- ---------------------------------------------------------------------
comment on function public.has_other_admin is
  'Vérifie qu''au moins un autre administrateur actif existe dans l''entreprise (exclusion de l''id passé).';

comment on function public.change_profile_role is
  'Change le rôle d''un profil en bloquant la rétrogradation du dernier administrateur. Réservé aux admins.';

comment on function public.hard_delete_user is
  'Supprime définitivement un utilisateur : compte auth, profil, et données liées. Bloqué si la cible est le dernier administrateur.';

comment on function public.soft_delete_user is
  'Marque un profil comme supprimé (soft delete). Bloqué si la cible est le dernier administrateur.';
