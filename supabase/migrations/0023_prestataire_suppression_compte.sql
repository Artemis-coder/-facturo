-- =====================================================================
-- Ma Bouate — Migration 0023 : suppression du compte auth à la
-- suppression d'une fiche prestataire + nettoyage des comptes fantômes
--
-- Problème : supprimer une fiche prestataire ne supprimait que la ligne
-- public.prestataires. Le compte auth (auth.users) et la ligne profiles
-- (role='prestataire') créés par le trigger handle_new_user restaient,
-- et le prestataire supprimé continuait d'apparaître dans la liste
-- des membres de l'équipe.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Nettoyage ponctuel des fantômes existants : comptes prestataires
--    dont la fiche a déjà été supprimée. Suppression scopée : uniquement
--    les profils role='prestataire' sans fiche liée. Aucun autre rôle
--    (administrateur, comptable, commercial, employe, super_admin) n'est
--    affecté. profiles cascade depuis auth.users (FK 0001).
-- ---------------------------------------------------------------------
delete from auth.users
where id in (
  select p.id
  from public.profiles p
  where p.role = 'prestataire'
    and not exists (select 1 from public.prestataires pr where pr.user_id = p.id)
);

-- ---------------------------------------------------------------------
-- 2. Trigger : suppression automatique du compte auth quand la fiche
--    prestataire est supprimée. Garde de sécurité : le compte n'est
--    supprimé que si le profil lié a bien role='prestataire' (protège
--    un compte dont le rôle aurait été reconverti entre-temps).
--
--    security definer requis : la suppression client s'exécute en rôle
--    authenticated ; seul le propriétaire postgres peut toucher auth.users.
-- ---------------------------------------------------------------------
create or replace function public.handle_prestataire_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.user_id is not null
     and exists (
       select 1 from public.profiles
       where id = old.user_id and role = 'prestataire'
     ) then
    delete from auth.users where id = old.user_id;
  end if;
  return old;
end;
$$;

drop trigger if exists on_prestataire_deleted on public.prestataires;
create trigger on_prestataire_deleted
  after delete on public.prestataires
  for each row
  execute function public.handle_prestataire_deleted();
