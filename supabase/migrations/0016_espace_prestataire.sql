-- =====================================================================
-- FACTURO — Migration 0016 : Espace Prestataire
-- À exécuter APRÈS 0014_prestataires.sql et 0015_role_prestataire.sql.
--
-- Ajoute :
--  - taches : to-do par projet/prestataire (statut + échéance)
--  - liaison compte ↔ fiche : prestataires.user_id, invitations.prestataire_id
--  - lien contrat ↔ prestataire : contracts.prestataire_id
--  - trigger handle_new_user étendu : à l'acceptation d'une invitation
--    de prestataire, le compte créé est relié à la fiche prestataire
--  - policies RLS dédiées : le prestataire ne lit/écrit QUE ses données
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Colonnes de liaison
-- ---------------------------------------------------------------------
alter table public.prestataires
  add column if not exists user_id uuid references auth.users(id);

create unique index if not exists idx_prestataires_user
  on public.prestataires(user_id) where user_id is not null;

alter table public.invitations
  add column if not exists prestataire_id uuid references public.prestataires(id);

alter table public.contracts
  add column if not exists prestataire_id uuid references public.prestataires(id) on delete set null;

-- ---------------------------------------------------------------------
-- 2. Table des tâches
-- ---------------------------------------------------------------------
create table if not exists public.taches (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  projet_id uuid not null references public.projets(id) on delete cascade,
  prestataire_id uuid not null references public.prestataires(id) on delete cascade,
  titre text not null check (char_length(trim(titre)) > 0),
  description text not null default '',
  statut text not null default 'À faire'
    check (statut in ('À faire', 'En cours', 'Terminée')),
  echeance date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_taches_entreprise_projet on public.taches(entreprise_id, projet_id);
create index if not exists idx_taches_prestataire on public.taches(prestataire_id);

alter table public.taches enable row level security;

-- ---------------------------------------------------------------------
-- 3. Fonctions utilitaires RLS (security definer, même pattern que 0001)
-- ---------------------------------------------------------------------
create or replace function public.current_prestataire_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.prestataires where user_id = auth.uid() limit 1;
$$;

create or replace function public.is_assigned_to_prestataire(p_projet_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.projet_prestataires
    where projet_id = p_projet_id
      and prestataire_id = public.current_prestataire_id()
  );
$$;

-- ---------------------------------------------------------------------
-- 4. Trigger d'inscription étendu : relie le compte à la fiche prestataire
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_entreprise_id uuid;
  invite record;
  assigned_role public.user_role;
begin
  select * into invite from public.invitations
    where lower(email) = lower(new.email) and accepted = false
    limit 1;

  if invite.id is not null then
    new_entreprise_id := invite.entreprise_id;
    assigned_role := invite.role;
    update public.invitations set accepted = true where id = invite.id;
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

  -- L'invitation provenait d'une fiche prestataire : relier le compte.
  if invite.id is not null and invite.prestataire_id is not null then
    update public.prestataires
    set user_id = new.id
    where id = invite.prestataire_id and user_id is null;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 5. RLS — taches : CRUD isolé par entreprise, accès prestataire limité
-- ---------------------------------------------------------------------
create policy "taches: lecture selon role" on public.taches
  for select using (
    public.is_super_admin()
    or (
      entreprise_id = public.current_entreprise_id()
      and (
        public.current_role() in ('administrateur', 'comptable', 'commercial')
        or (public.current_role() = 'prestataire' and prestataire_id = public.current_prestataire_id())
      )
    )
  );

create policy "taches: creation" on public.taches
  for insert with check (
    entreprise_id = public.current_entreprise_id()
    and (
      public.current_role() in ('administrateur', 'comptable', 'commercial')
      or (
        public.current_role() = 'prestataire'
        and prestataire_id = public.current_prestataire_id()
        and public.is_assigned_to_prestataire(projet_id)
      )
    )
  );

create policy "taches: modification" on public.taches
  for update using (
    entreprise_id = public.current_entreprise_id()
    and (
      public.current_role() in ('administrateur', 'comptable', 'commercial')
      or (
        public.current_role() = 'prestataire'
        and prestataire_id = public.current_prestataire_id()
        and public.is_assigned_to_prestataire(projet_id)
      )
    )
  ) with check (
    entreprise_id = public.current_entreprise_id()
    and (
      public.current_role() in ('administrateur', 'comptable', 'commercial')
      or (
        public.current_role() = 'prestataire'
        and prestataire_id = public.current_prestataire_id()
        and public.is_assigned_to_prestataire(projet_id)
      )
    )
  );

create policy "taches: suppression admin" on public.taches
  for delete using (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() = 'administrateur'
  );

-- ---------------------------------------------------------------------
-- 6. RLS — lecture prestataire sur sa fiche / ses liens / ses projets
-- ---------------------------------------------------------------------
create policy "prestataires: lecture de sa propre fiche" on public.prestataires
  for select using (id = public.current_prestataire_id());

drop policy if exists "projet_prestataires: lecture entreprise" on public.projet_prestataires;
create policy "projet_prestataires: lecture entreprise" on public.projet_prestataires
  for select using (
    public.is_super_admin()
    or (
      entreprise_id = public.current_entreprise_id()
      and (
        public.current_role() in ('administrateur', 'comptable', 'commercial')
        or (public.current_role() = 'prestataire' and prestataire_id = public.current_prestataire_id())
      )
    )
  );

drop policy if exists "projets: lecture entreprise" on public.projets;
create policy "projets: lecture entreprise" on public.projets
  for select using (
    public.is_super_admin()
    or (
      entreprise_id = public.current_entreprise_id()
      and (
        public.current_role() in ('administrateur', 'comptable', 'commercial')
        or (public.current_role() = 'prestataire' and public.is_assigned_to_prestataire(id))
      )
    )
  );

-- ---------------------------------------------------------------------
-- 7. RLS — contracts : le prestataire lit LES SIENS, brouillons exclus
-- ---------------------------------------------------------------------
create policy "contracts: prestataire lit ses contrats" on public.contracts
  for select using (
    prestataire_id = public.current_prestataire_id()
    and statut <> 'Brouillon'
  );

-- ---------------------------------------------------------------------
-- 8. RLS — invitations : l'admin gère tout ; comptable/commercial ne
--    peuvent inviter QUE des prestataires (principe zero-trust : éviter
--    qu'un comptable/commercial ne crée un compte administrateur).
-- ---------------------------------------------------------------------
drop policy if exists "invitations: admin gere celles de son entreprise" on public.invitations;

create policy "invitations: lecture entreprise" on public.invitations
  for select using (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur', 'comptable', 'commercial')
  );

create policy "invitations: creation" on public.invitations
  for insert with check (
    entreprise_id = public.current_entreprise_id()
    and (
      public.current_role() = 'administrateur'
      or (public.current_role() in ('comptable', 'commercial') and role = 'prestataire')
    )
  );

create policy "invitations: modification admin" on public.invitations
  for update using (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() = 'administrateur'
  );

create policy "invitations: suppression" on public.invitations
  for delete using (
    entreprise_id = public.current_entreprise_id()
    and (
      public.current_role() = 'administrateur'
      or (public.current_role() in ('comptable', 'commercial') and role = 'prestataire')
    )
  );

-- ---------------------------------------------------------------------
-- 9. profiles : le prestataire ne lit pas la LISTE de l'équipe, mais
--    peut lire SON PROPRE profil (indispensable à la connexion :
--    useAuth.loadProfile lit la ligne du profil connecté + role).
-- ---------------------------------------------------------------------
drop policy if exists "voir les profils de son entreprise" on public.profiles;
create policy "voir les profils de son entreprise" on public.profiles
  for select using (
    (entreprise_id = public.current_entreprise_id() and public.current_role() <> 'prestataire')
    or public.is_super_admin()
  );

create policy "prestataire: lecture de son propre profil" on public.profiles
  for select using (id = auth.uid());
