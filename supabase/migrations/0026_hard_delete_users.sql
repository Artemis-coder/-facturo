-- Migration 0026: Hard Delete - Suppression définitive des utilisateurs avec leur compte auth
-- Cette migration ajoute une fonction pour supprimer complètement un utilisateur
-- (compte auth + profil + données liées)

-- ---------------------------------------------------------------------
-- 1. Fonction de suppression définitive d'un utilisateur (hard delete)
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
begin
  -- Récupérer les infos de l'utilisateur à supprimer
  select id, entreprise_id into v_user_id, v_entreprise_id
  from public.profiles
  where id = p_profile_id;

  if v_user_id is null then
    raise exception 'Utilisateur introuvable';
  end if;

  -- Vérifier que l'utilisateur a les droits (admin de l'entreprise ou super_admin)
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

  -- Ne pas permettre la suppression de soi-même
  if p_profile_id = p_deleted_by then
    raise exception 'Impossible de supprimer son propre compte';
  end if;

  -- Ne pas permettre de supprimer un super_admin
  if exists (select 1 from public.profiles where id = p_profile_id and role = 'super_admin') then
    raise exception 'Impossible de supprimer un super_admin';
  end if;

  -- Ne pas permettre de supprimer le dernier administrateur de l'entreprise
  if exists (select 1 from public.profiles where id = p_profile_id and role = 'administrateur') then
    if (select count(*) from public.profiles where entreprise_id = v_entreprise_id and role = 'administrateur' and id != p_profile_id) = 0 then
      raise exception 'Impossible de supprimer le dernier administrateur de l''entreprise';
    end if;
  end if;

  -- 1. Si l'utilisateur est un prestataire, supprimer aussi l'entrée dans la table prestataires
  delete from public.prestataires where user_id = v_user_id;

  -- 2. Supprimer le compte d'authentification dans auth.users
  -- (nécessite les droits security definer)
  delete from auth.users where id = v_user_id;

  -- 3. Supprimer le profil (CASCADE supprimera les données liées)
  delete from public.profiles where id = p_profile_id;

  -- Note : Les données liées (devis créés, factures, etc.) sont conservées
  -- car elles ont created_by qui référence l'utilisateur mais sans contrainte CASCADE
  -- Si vous voulez supprimer aussi ces données, ajoutez des DELETE supplémentaires ici
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Fonction de suppression définitive d'un prestataire (hard delete)
-- ---------------------------------------------------------------------
create or replace function public.hard_delete_prestataire(p_prestataire_id uuid, p_deleted_by uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_entreprise_id uuid;
begin
  -- Récupérer les infos du prestataire
  select user_id, entreprise_id into v_user_id, v_entreprise_id
  from public.prestataires
  where id = p_prestataire_id;

  if not found then
    raise exception 'Prestataire introuvable';
  end if;

  -- Vérifier que l'utilisateur a les droits
  if not public.is_super_admin() then
    if not exists (
      select 1 from public.profiles
      where id = p_deleted_by
      and entreprise_id = v_entreprise_id
      and role = 'administrateur'
    ) then
      raise exception 'Accès refusé : seul l''administrateur peut supprimer';
    end if;
  end if;

  -- Si le prestataire a un compte utilisateur, le supprimer aussi
  if v_user_id is not null then
    delete from auth.users where id = v_user_id;
    delete from public.profiles where id = v_user_id;
  end if;

  -- Supprimer le prestataire
  delete from public.prestataires where id = p_prestataire_id;

  -- Note : Les liens projet_prestataires et taches seront supprimés via CASCADE
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Commentaires pour documentation
-- ---------------------------------------------------------------------
comment on function public.hard_delete_user is
  'Supprime définitivement un utilisateur : compte auth, profil, et données liées. Réservé aux admins.';

comment on function public.hard_delete_prestataire is
  'Supprime définitivement un prestataire et son compte utilisateur si existant. Réservé aux admins.';
