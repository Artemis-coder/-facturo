-- =====================================================================
-- FACTURO — Migration 0028 : correctif "Database error saving new user"
--
-- Diagnostic : à l'inscription d'un prestataire invité, la transaction
-- du trigger handle_new_user échouait -> Supabase renvoyait
-- {"code":"unexpected_failure","message":"Database error saving new user"}.
--
-- Causes :
--   1. Le trigger auto_create_prestataire (0027_prestataire_profile_sync)
--      insérait une fiche prestataires avec type_projet = 'ponctuel' et
--      type_contrat = 'freelance' : 'ponctuel' viole la contrainte CHECK
--      de 0014_prestataires.sql (valeurs autorisées : 'Design graphique',
--      'Développement web', 'Audiovisuel', 'Marketing', 'Rédaction',
--      'Autre') et 'freelance' (minuscule) viole également la CHECK sur
--      type_contrat (les valeurs attendues sont à casse stricte :
--      'Prestation de service', 'Sous-traitance', 'Freelance',
--      'Partenariat').
--   2. handle_new_user (0016) insérait le profil APRES le reliage, mais
--      le trigger auto_create se déclenchait sur cette insertion et
--      tentait une insertion doublon systématique (fiche non trouvée via
--      user_id tant que la transaction n'est pas finie dans certains
--      cas) ; toute erreur de cette insertion faisait échouer toute
--      l'inscription.
--
-- Correctifs :
--   1. auto_create_prestataire_from_profile : valeurs conformes aux
--      contraintes CHECK, et toute erreur d'insertion isolée dans un
--      bloc EXCEPTION pour ne plus jamais casser la transaction
--      d'inscription.
--   2. handle_new_user : reliage prestataires.user_id AVANT l'insertion
--      du profil, puis insertion du profil avec on conflict do nothing.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Trigger auto_create (corrigé : valeurs valides + erreurs isolées)
-- ---------------------------------------------------------------------
create or replace function public.auto_create_prestataire_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'prestataire' then
    if not exists (select 1 from public.prestataires where user_id = new.id) then
      begin
        insert into public.prestataires (
          entreprise_id,
          nom,
          email,
          user_id,
          type_projet,
          type_contrat,
          created_by
        ) values (
          new.entreprise_id,
          coalesce(new.nom_complet, new.email, 'Prestataire'),
          new.email,
          new.id,
          'Autre',
          'Prestation de service',
          new.id
        );
      exception when others then
        null;
      end;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_auto_create_prestataire on public.profiles;
create trigger trigger_auto_create_prestataire
  after insert or update of role on public.profiles
  for each row
  execute function public.auto_create_prestataire_from_profile();

-- ---------------------------------------------------------------------
-- 2. handle_new_user : reliage prestataire AVANT l'insertion du profil
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_entreprise_id uuid;
  invite record;
  assigned_role public.user_role;
begin
  select * into invite from public.invitations
    where lower(email) = lower(new.email) and accepted = false
    order by created_at desc
    limit 1;

  if invite.id is not null then
    new_entreprise_id := invite.entreprise_id;
    assigned_role := invite.role;

    update public.invitations set accepted = true where id = invite.id;

    if invite.prestataire_id is not null then
      update public.prestataires
      set user_id = new.id
      where id = invite.prestataire_id and user_id is null;
    end if;
  else
    insert into public.entreprises (nom)
    values (coalesce(new.raw_user_meta_data->>'entreprise_nom', 'Mon entreprise'))
    returning id into new_entreprise_id;
    assigned_role := 'administrateur';
  end if;

  insert into public.profiles (id, entreprise_id, nom_complet, email, role)
  values (
    new.id, new_entreprise_id,
    coalesce(new.raw_user_meta_data->>'nom_complet', new.email),
    new.email, assigned_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.auto_create_prestataire_from_profile is
  'Crée automatiquement une fiche prestataire si un profil prestataire est créé sans fiche liée. Valeurs conformes aux contraintes CHECK de 0014 ; toute erreur d''insertion est isolée pour ne jamais casser l''inscription.';

comment on function public.handle_new_user is
  'Trigger d''inscription : traite les invitations (équipe et prestataire), relie la fiche prestataire AVANT l''insertion du profil, puis crée le profil.';
