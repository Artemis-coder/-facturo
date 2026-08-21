-- =====================================================================
-- FACTURO — Migration 0025 : Soft delete pour utilisateurs et prestataires
-- Permet de "supprimer" un utilisateur/prestataire tout en gardant ses données
-- pour restauration ultérieure.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Ajout colonnes soft delete sur profiles
-- ---------------------------------------------------------------------
alter table public.profiles
add column if not exists deleted_at timestamptz,
add column if not exists deleted_by uuid references public.profiles(id);

-- Index pour performance
create index if not exists idx_profiles_deleted on public.profiles(deleted_at);
create index if not exists idx_profiles_entreprise_active on public.profiles(entreprise_id, deleted_at);

-- ---------------------------------------------------------------------
-- 2. Ajout colonnes soft delete sur prestataires
-- ---------------------------------------------------------------------
alter table public.prestataires
add column if not exists deleted_at timestamptz,
add column if not exists deleted_by uuid references public.profiles(id);

-- Index pour performance
create index if not exists idx_prestataires_deleted on public.prestataires(deleted_at);
create index if not exists idx_prestataires_entreprise_active on public.prestataires(entreprise_id, deleted_at);

-- ---------------------------------------------------------------------
-- 3. Mise à jour des politiques RLS pour exclure les soft-deleted par défaut
-- ---------------------------------------------------------------------

-- Supprimer les anciennes politiques sur profiles
drop policy if exists "voir les profils de son entreprise" on public.profiles;
drop policy if exists "admin gere les profils de son entreprise" on public.profiles;
drop policy if exists "utilisateur modifie son propre profil" on public.profiles;

-- Nouvelles politiques : excluent les soft-deleted sauf pour super_admin
create policy "voir les profils actifs de son entreprise" on public.profiles
  for select using (
    entreprise_id = public.current_entreprise_id()
    and deleted_at is null
    or public.is_super_admin()
  );

create policy "admin gere les profils de son entreprise" on public.profiles
  for update using (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() = 'administrateur'
    and deleted_at is null
  );

create policy "utilisateur modifie son propre profil" on public.profiles
  for update using (id = auth.uid());

-- ---------------------------------------------------------------------
-- 4. Mise à jour des politiques RLS sur prestataires
-- ---------------------------------------------------------------------

drop policy if exists "prestataires: lecture entreprise" on public.prestataires;
drop policy if exists "prestataires: creation admin/comptable/commercial" on public.prestataires;
drop policy if exists "prestataires: modification admin/comptable/commercial" on public.prestataires;
drop policy if exists "prestataires: suppression admin" on public.prestataires;

create policy "prestataires: lecture entreprise" on public.prestataires
  for select using (
    entreprise_id = public.current_entreprise_id()
    and deleted_at is null
    or public.is_super_admin()
  );

create policy "prestataires: creation admin/comptable/commercial" on public.prestataires
  for insert with check (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur', 'comptable', 'commercial')
  );

create policy "prestataires: modification admin/comptable/commercial" on public.prestataires
  for update using (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur', 'comptable', 'commercial')
    and deleted_at is null
  );

-- Soft delete : seul admin peut "supprimer" (marquer deleted_at)
create policy "prestataires: soft delete admin" on public.prestataires
  for update using (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() = 'administrateur'
  );

-- Hard delete réel : seulement super_admin (ou via trigger de nettoyage)
create policy "prestataires: hard delete super_admin" on public.prestataires
  for delete using (public.is_super_admin());

-- ---------------------------------------------------------------------
-- 5. Fonction de restauration (pour super_admin ou admin)
-- ---------------------------------------------------------------------
create or replace function public.restore_user(p_profile_id uuid, p_restored_by uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Vérifier que l'utilisateur a les droits (admin de l'entreprise ou super_admin)
  if not public.is_super_admin() then
    if not exists (
      select 1 from public.profiles
      where id = p_profile_id
      and entreprise_id = public.current_entreprise_id()
      and public.current_role() = 'administrateur'
    ) then
      raise exception 'Accès refusé : seul l''administrateur de l''entreprise ou super_admin peut restaurer';
    end if;
  end if;

  update public.profiles
  set deleted_at = null, deleted_by = p_restored_by
  where id = p_profile_id;
end;
$$;

create or replace function public.restore_prestataire(p_prestataire_id uuid, p_restored_by uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    if not exists (
      select 1 from public.prestataires
      where id = p_prestataire_id
      and entreprise_id = public.current_entreprise_id()
      and public.current_role() = 'administrateur'
    ) then
      raise exception 'Accès refusé : seul l''administrateur de l''entreprise ou super_admin peut restaurer';
    end if;
  end if;

  update public.prestataires
  set deleted_at = null, deleted_by = p_restored_by
  where id = p_prestataire_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Fonction de suppression douce pour utilisateurs (admin only)
-- ---------------------------------------------------------------------
create or replace function public.soft_delete_user(p_profile_id uuid, p_deleted_by uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Vérifier que l'utilisateur a les droits (admin de l'entreprise ou super_admin)
  if not public.is_super_admin() then
    if not exists (
      select 1 from public.profiles
      where id = p_profile_id
      and entreprise_id = public.current_entreprise_id()
      and public.current_role() = 'administrateur'
    ) then
      raise exception 'Accès refusé : seul l''administrateur de l''entreprise ou super_admin peut supprimer';
    end if;
  end if;

  -- Ne pas permettre la suppression de soi-même
  if p_profile_id = p_deleted_by then
    raise exception 'Impossible de supprimer son propre compte';
  end if;

  -- Ne pas permettre de supprimer un super_admin
  if exists (select 1 from public.profiles where id = p_profile_id and role = 'super_admin') then
    raise exception 'Impossible de supprimer un super_admin';
  end if;

  update public.profiles
  set deleted_at = now(), deleted_by = p_deleted_by
  where id = p_profile_id;
end;
$$;

create or replace function public.soft_delete_prestataire(p_prestataire_id uuid, p_deleted_by uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    if not exists (
      select 1 from public.prestataires
      where id = p_prestataire_id
      and entreprise_id = public.current_entreprise_id()
      and public.current_role() = 'administrateur'
    ) then
      raise exception 'Accès refusé : seul l''administrateur de l''entreprise ou super_admin peut supprimer';
    end if;
  end if;

  update public.prestataires
  set deleted_at = now(), deleted_by = p_deleted_by
  where id = p_prestataire_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Vue pour lister les utilisateurs + prestataires ensemble (pour la page Utilisateurs)
-- ---------------------------------------------------------------------
create or replace view public.v_membres_entreprise as
select
  p.id,
  p.entreprise_id,
  p.nom_complet,
  p.email,
  p.role,
  p.created_at,
  p.deleted_at,
  p.deleted_by,
  'user'::text as type_membre,
  null::text as societe,
  null::text as type_projet,
  null::text as type_contrat
from public.profiles p
where p.deleted_at is null

union all

select
  pr.id,
  pr.entreprise_id,
  pr.nom as nom_complet,
  pr.email,
  'prestataire'::public.user_role as role,
  pr.created_at,
  pr.deleted_at,
  pr.deleted_by,
  'prestataire'::text as type_membre,
  pr.societe,
  pr.type_projet,
  pr.type_contrat
from public.prestataires pr
where pr.deleted_at is null;

-- Politique sur la vue (hériter des tables sous-jacentes)
grant select on public.v_membres_entreprise to authenticated;