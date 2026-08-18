-- =====================================================================
-- FACTURO — Migration 0024 : Fichiers de projet (« Mes fichiers »)
--
-- L'admin (ou comptable/commercial) joint des fichiers à un projet pour
-- les mettre à disposition des prestataires affectés. Le prestataire les
-- retrouve dans son onglet « Mes fichiers », peut les prévisualiser et
-- les télécharger.
--
-- Ajoute :
--  - fichiers_projets : registre des fichiers joints aux projets
--  - bucket storage privé « fichiers-projets » (chemin :
--    {entreprise_id}/{projet_id}/{uuid}-{nom})
--  - policies RLS : gestion réservée à admin/comptable/commercial,
--    lecture prestataire limitée aux projets où il est affecté
--  - notifications : nouveau type « fichier_disponible »
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Table registre des fichiers
-- ---------------------------------------------------------------------
create table if not exists public.fichiers_projets (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  projet_id uuid not null references public.projets(id) on delete cascade,
  nom text not null check (char_length(trim(nom)) > 0),
  categorie text not null default 'Autre'
    check (categorie in ('Design graphique', 'Développement web', 'Audiovisuel', 'Marketing', 'Rédaction', 'Autre')),
  mime_type text not null default '',
  taille_octets bigint not null default 0,
  storage_path text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_fichiers_projets_projet
  on public.fichiers_projets(projet_id, created_at desc);
create index if not exists idx_fichiers_projets_entreprise
  on public.fichiers_projets(entreprise_id);

alter table public.fichiers_projets enable row level security;

-- ---------------------------------------------------------------------
-- 2. RLS — fichiers_projets
-- ---------------------------------------------------------------------
create policy "fichiers projets: lecture selon role" on public.fichiers_projets
  for select using (
    public.is_super_admin()
    or (
      entreprise_id = public.current_entreprise_id()
      and (
        public.current_role() in ('administrateur', 'comptable', 'commercial')
        or (public.current_role() = 'prestataire' and public.is_assigned_to_prestataire(projet_id))
      )
    )
  );

create policy "fichiers projets: creation gestion" on public.fichiers_projets
  for insert with check (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur', 'comptable', 'commercial')
  );

create policy "fichiers projets: modification gestion" on public.fichiers_projets
  for update using (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur', 'comptable', 'commercial')
  ) with check (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur', 'comptable', 'commercial')
  );

create policy "fichiers projets: suppression admin" on public.fichiers_projets
  for delete using (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() = 'administrateur'
  );

-- ---------------------------------------------------------------------
-- 3. Bucket storage privé
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('fichiers-projets', 'fichiers-projets', false)
on conflict (id) do update set public = false;

-- ---------------------------------------------------------------------
-- 4. Fonctions de vérification du chemin (security definer, idem 0001)
-- ---------------------------------------------------------------------
-- Le prestataire n'a pas de current_entreprise_id() : son accès est
-- validé via le projet (segment 2 du chemin), qui doit appartenir à
-- l'entreprise (segment 1) ET lui être affecté.
create or replace function public.fichier_projet_lisible(p_path text)
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  if p_path !~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/' then
    return false;
  end if;
  return exists (
    select 1 from public.projets p
    where p.id = split_part(p_path, '/', 2)::uuid
      and p.entreprise_id = split_part(p_path, '/', 1)::uuid
      and public.is_assigned_to_prestataire(p.id)
  );
exception when others then
  return false;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Policies storage.objects
-- ---------------------------------------------------------------------
create policy "fichiers projets: lecture" on storage.objects
  for select using (
    bucket_id = 'fichiers-projets'
    and (
      public.is_super_admin()
      or (
        split_part(name, '/', 1) = public.current_entreprise_id()::text
        and public.current_role() in ('administrateur', 'comptable', 'commercial')
      )
      or public.fichier_projet_lisible(name)
    )
  );

create policy "fichiers projets: depot gestion" on storage.objects
  for insert with check (
    bucket_id = 'fichiers-projets'
    and split_part(name, '/', 1) = public.current_entreprise_id()::text
    and public.current_role() in ('administrateur', 'comptable', 'commercial')
  );

create policy "fichiers projets: modification gestion" on storage.objects
  for update using (
    bucket_id = 'fichiers-projets'
    and split_part(name, '/', 1) = public.current_entreprise_id()::text
    and public.current_role() in ('administrateur', 'comptable', 'commercial')
  ) with check (
    bucket_id = 'fichiers-projets'
    and split_part(name, '/', 1) = public.current_entreprise_id()::text
    and public.current_role() in ('administrateur', 'comptable', 'commercial')
  );

create policy "fichiers projets: suppression admin" on storage.objects
  for delete using (
    bucket_id = 'fichiers-projets'
    and split_part(name, '/', 1) = public.current_entreprise_id()::text
    and public.current_role() = 'administrateur'
  );

-- ---------------------------------------------------------------------
-- 6. Notifications : nouveau type
-- ---------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'tache_attribuee',
    'mission_attribuee',
    'tache_bloquee',
    'tache_terminee',
    'contrat_change',
    'fichier_disponible'
  ));
