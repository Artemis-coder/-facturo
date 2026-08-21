-- =====================================================================
-- FACTURO — Migration 0029 : fiabilisation de la suppression des membres
--
-- Problème : la suppression d'un utilisateur ou d'un prestataire échouait
-- ("Erreur : ... verification") :
--   1. hard_delete_prestataire supprimait auth.users AVANT la fiche
--      prestataires ; or prestataires.user_id référence auth.users(id)
--      SANS on delete -> violation de contrainte FK, rollback.
--   2. hard_delete_user supprimait le profil alors que ~15 tables
--      référencent profiles(id) via created_by/invited_by/changed_by
--      (sans on delete) -> violation FK en cascade depuis auth.users.
--
-- Correctifs :
--   - helper nullifie_references_profil : passe à NULL toutes les
--     références d'audit (les documents métier sont conservés) ;
--   - hard_delete_user : purge des références et de la fiche prestataire
--     éventuelle AVANT la suppression du profil et du compte auth ;
--   - hard_delete_prestataire : suppression de la fiche d'abord (cascade
--     liens/tâches/invitations, trigger de purge du compte), nouvel
--     argument optionnel p_supprimer_projets pour supprimer les projets
--     liés (réservé administrateur, devis/factures conservés et détachés).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Helper : neutralise toutes les références profiles vers un
--    utilisateur (conservation des documents métier).
-- ---------------------------------------------------------------------
create or replace function public.nullifie_references_profil(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.clients set created_by = null where created_by = p_user_id;
  update public.devis set created_by = null where created_by = p_user_id;
  update public.devis_historique set created_by = null where created_by = p_user_id;
  update public.factures set created_by = null where created_by = p_user_id;
  update public.paiements set created_by = null where created_by = p_user_id;
  update public.invitations set invited_by = null where invited_by = p_user_id;
  update public.projets set created_by = null where created_by = p_user_id;
  update public.depenses set created_by = null where created_by = p_user_id;
  update public.contracts set created_by = null where created_by = p_user_id;
  update public.contract_templates set created_by = null where created_by = p_user_id;
  update public.contract_history set created_by = null where created_by = p_user_id;
  update public.projet_prestataires set created_by = null where created_by = p_user_id;
  update public.taches set created_by = null where created_by = p_user_id;
  update public.tache_historique set changed_by = null where changed_by = p_user_id;
  update public.fichiers_projets set created_by = null where created_by = p_user_id;
  update public.prestataires set created_by = null where created_by = p_user_id;
  update public.prestataires set deleted_by = null where deleted_by = p_user_id;
  update public.profiles set deleted_by = null where deleted_by = p_user_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Suppression définitive d'un utilisateur (réécrite : ordre sûr)
-- ---------------------------------------------------------------------
create or replace function public.hard_delete_user(p_profile_id uuid, p_deleted_by uuid)
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
        and entreprise_id = v_entreprise_id
        and role = 'administrateur'
        and deleted_at is null
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

  perform public.nullifie_references_profil(p_profile_id);

  delete from public.prestataires where user_id = p_profile_id;
  delete from public.profiles where id = p_profile_id;
  delete from auth.users where id = p_profile_id;
end;
$$;

-- L'ancienne version 2 arguments (migration 0026) est cassée (ordre de
-- suppression violant les FK) et resterait active en parallèle de la
-- nouvelle signature : on la retire. Les appels existants à 2 arguments
-- résolvent désormais vers la nouvelle fonction (3e argument par défaut).
drop function if exists public.hard_delete_prestataire(uuid, uuid);

-- ---------------------------------------------------------------------
-- 3. Suppression définitive d'un prestataire (réécrite : fiche d'abord,
--    purge des références, option de suppression des projets liés)
-- ---------------------------------------------------------------------
create or replace function public.hard_delete_prestataire(
  p_prestataire_id uuid,
  p_deleted_by uuid,
  p_supprimer_projets boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_entreprise_id uuid;
begin
  select user_id, entreprise_id into v_user_id, v_entreprise_id
  from public.prestataires
  where id = p_prestataire_id;

  if not found then
    raise exception 'Prestataire introuvable';
  end if;

  if not public.is_super_admin() then
    if not exists (
      select 1 from public.profiles
      where id = p_deleted_by
        and entreprise_id = v_entreprise_id
        and role = 'administrateur'
        and deleted_at is null
    ) then
      raise exception 'Accès refusé : seul l''administrateur de l''entreprise peut supprimer';
    end if;
  end if;

  if p_supprimer_projets then
    delete from public.projets
    where id in (
      select projet_id from public.projet_prestataires
      where prestataire_id = p_prestataire_id
    );
  end if;

  if v_user_id is not null then
    perform public.nullifie_references_profil(v_user_id);
  end if;

  delete from public.prestataires where id = p_prestataire_id;

  if v_user_id is not null then
    delete from public.profiles where id = v_user_id;
    delete from auth.users where id = v_user_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Documentation
-- ---------------------------------------------------------------------
comment on function public.nullifie_references_profil is
  'Passe à NULL toutes les colonnes d''audit (created_by, invited_by, changed_by, deleted_by) référençant un profil, pour permettre sa suppression sans violer les contraintes FK. Les documents métier sont conservés.';

comment on function public.hard_delete_user is
  'Supprime définitivement un utilisateur : références audit purgées, fiche prestataire éventuelle, profil puis compte auth. Réservé aux admins (garde dernier administrateur).';

comment on function public.hard_delete_prestataire is
  'Supprime définitivement un prestataire : projets liés si demandé (devis/factures conservés et détachés), références audit purgées, fiche prestataire puis compte auth/profil. Réservé aux admins.';
