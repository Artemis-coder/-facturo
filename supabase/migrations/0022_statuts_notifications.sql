-- =====================================================================
-- FACTURO — Migration 0022 : Statuts Bloquée/Résilié + notifications
--
-- Ajoute :
--  - taches.statut : valeur 'Bloquée' en plus des 3 existantes
--  - contracts.statut : valeur 'Résilié' en plus des 3 existantes
--  - public.notifications : notifications in-app temps réel
--  - Fonctions definer pour insérer des notifs et lister les admins
--  - Publication realtime sur notifications
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Statuts
-- ---------------------------------------------------------------------
alter table public.taches drop constraint if exists taches_statut_check;
alter table public.taches
  add constraint taches_statut_check
  check (statut in ('À faire', 'En cours', 'Terminée', 'Bloquée'));

alter table public.contracts drop constraint if exists contracts_statut_check;
alter table public.contracts
  add constraint contracts_statut_check
  check (statut in ('Brouillon', 'Envoyé', 'Signé', 'Résilié'));

-- ---------------------------------------------------------------------
-- 2. Table notifications
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  destinataire_user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in (
    'tache_attribuee',
    'mission_attribuee',
    'tache_bloquee',
    'tache_terminee',
    'contrat_change'
  )),
  titre text not null,
  message text not null,
  lu boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_destinataire
  on public.notifications(destinataire_user_id, lu, created_at desc);

alter table public.notifications enable row level security;

-- Un utilisateur lit uniquement ses propres notifications
create policy "notifications: lecture destinataire"
  on public.notifications for select
  using (destinataire_user_id = auth.uid());

-- Marquage lu/unlu : le destinataire uniquement, et il ne peut toucher
-- que cette ligne (with check = même destinataire)
create policy "notifications: marquage lu destinataire"
  on public.notifications for update
  using (destinataire_user_id = auth.uid())
  with check (destinataire_user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 3. Fonctions (security definer : inserts contrôlés, pas d'insert
--    générique côté client)
-- ---------------------------------------------------------------------
create or replace function public.notify_evenement(
  p_destinataire_user_id uuid,
  p_entreprise_id uuid,
  p_type text,
  p_titre text,
  p_message text
) returns void language sql security definer set search_path = public as $$
  insert into public.notifications
    (entreprise_id, destinataire_user_id, type, titre, message)
  values (p_entreprise_id, p_destinataire_user_id, p_type, p_titre, p_message);
$$;

-- Retourne les auth.uid() des administrateurs d'une entreprise.
-- Le prestataire ne peut pas lister la team (RLS profiles), mais peut
-- obtenir les admins pour les prévenir d'un blocage via notify_evenement.
create or replace function public.get_admin_user_ids(p_entreprise_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles
  where entreprise_id = p_entreprise_id and role = 'administrateur';
$$;

-- ---------------------------------------------------------------------
-- 4. Realtime : publication des INSERT de notifications
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;
