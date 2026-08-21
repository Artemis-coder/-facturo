-- Migration 0027: Synchronisation automatique profil prestataire
-- Quand un utilisateur avec le rôle "prestataire" est créé, créer automatiquement
-- une entrée correspondante dans la table prestataires

-- ---------------------------------------------------------------------
-- 1. Fonction trigger pour créer automatiquement un prestataire
-- ---------------------------------------------------------------------
create or replace function public.auto_create_prestataire_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Si le profil a le rôle prestataire et qu'il n'existe pas déjà dans prestataires
  if NEW.role = 'prestataire' then
    if not exists (select 1 from public.prestataires where user_id = NEW.id) then
      insert into public.prestataires (
        entreprise_id,
        nom,
        email,
        user_id,
        type_projet,
        type_contrat,
        created_by
      ) values (
        NEW.entreprise_id,
        NEW.nom_complet,
        NEW.email,
        NEW.id,
        'ponctuel', -- valeur par défaut
        'freelance', -- valeur par défaut
        NEW.id
      );
    end if;
  end if;

  return NEW;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Trigger sur la table profiles
-- ---------------------------------------------------------------------
drop trigger if exists trigger_auto_create_prestataire on public.profiles;

create trigger trigger_auto_create_prestataire
  after insert or update of role on public.profiles
  for each row
  execute function public.auto_create_prestataire_from_profile();

-- ---------------------------------------------------------------------
-- 3. Fonction pour synchroniser le nom et l'email entre profil et prestataire
-- ---------------------------------------------------------------------
create or replace function public.sync_prestataire_profile_data()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Si le profil est un prestataire, mettre à jour les données dans la table prestataires
  if NEW.role = 'prestataire' then
    update public.prestataires
    set
      nom = NEW.nom_complet,
      email = NEW.email
    where user_id = NEW.id;
  end if;

  return NEW;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Trigger pour synchroniser les données
-- ---------------------------------------------------------------------
drop trigger if exists trigger_sync_prestataire_data on public.profiles;

create trigger trigger_sync_prestataire_data
  after update of nom_complet, email on public.profiles
  for each row
  execute function public.sync_prestataire_profile_data();

-- ---------------------------------------------------------------------
-- 5. Commentaires
-- ---------------------------------------------------------------------
comment on function public.auto_create_prestataire_from_profile is
  'Crée automatiquement une entrée prestataire quand un profil avec le rôle prestataire est créé';

comment on function public.sync_prestataire_profile_data is
  'Synchronise les données (nom, email) entre le profil et la table prestataires';
