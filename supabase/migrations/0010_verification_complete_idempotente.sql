-- =====================================================================
-- FACTURO — Migration 0010 : VÉRIFICATION COMPLÈTE ET IDEMPOTENTE
-- =====================================================================
-- Ce script reconstruit tout l'état attendu de la base (tables, colonnes,
-- fonctions, triggers, policies de sécurité) et peut être exécuté autant
-- de fois que nécessaire, sur une base neuve ou déjà partiellement à jour,
-- SANS RISQUE ni perte de données : chaque instruction vérifie d'abord si
-- l'élément existe déjà.
--
-- Utile si une ou plusieurs migrations précédentes (0001 à 0009) n'ont pas
-- été exécutées — ce qui provoque des erreurs comme :
--   "Could not find the table 'public.invitations' in the schema cache"
--   "Could not find the 'preferences' column of 'entreprises'"
--
-- À exécuter dans Supabase → SQL Editor → New query → Run.
-- =====================================================================

create extension if not exists "pgcrypto";

do $$ begin
  create type public.user_role as enum ('super_admin', 'administrateur', 'comptable', 'commercial', 'employe');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------
-- TABLES (créées seulement si absentes)
-- ---------------------------------------------------------------------
create table if not exists public.entreprises (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  rccm text,
  nif text,
  adresse text,
  telephone text,
  devise text default 'FCFA (XOF)',
  langue text default 'Français',
  conditions_generales text,
  tva_defaut numeric default 18,
  prefixe_facture text default 'F-',
  prefixe_devis text default 'D-',
  prochain_numero int default 1,
  created_at timestamptz default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  entreprise_id uuid references public.entreprises(id) on delete cascade,
  nom_complet text,
  email text,
  role public.user_role not null default 'administrateur',
  created_at timestamptz default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  nom text not null,
  societe text,
  email text,
  telephone text,
  ville text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.produits (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  nom text not null,
  categorie text,
  prix_ht numeric not null default 0,
  tva numeric not null default 18,
  created_at timestamptz default now()
);

create table if not exists public.devis (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  client_id uuid references public.clients(id),
  date date default current_date,
  statut text not null default 'Brouillon'
    check (statut in ('Brouillon','Envoyé','Accepté','Refusé','Expiré')),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  unique (entreprise_id, numero)
);

create table if not exists public.devis_lignes (
  id uuid primary key default gen_random_uuid(),
  devis_id uuid not null references public.devis(id) on delete cascade,
  produit_id uuid references public.produits(id),
  nom text not null,
  prix_ht numeric not null default 0,
  tva numeric not null default 18,
  qty numeric not null default 1,
  remise numeric not null default 0,
  ordre int default 0
);

create table if not exists public.devis_details (
  id uuid primary key default gen_random_uuid(),
  ligne_id uuid not null references public.devis_lignes(id) on delete cascade,
  label text,
  prix numeric not null default 0
);

create table if not exists public.devis_historique (
  id uuid primary key default gen_random_uuid(),
  devis_id uuid not null references public.devis(id) on delete cascade,
  date date default current_date,
  action text not null,
  detail text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.factures (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  client_id uuid references public.clients(id),
  date date default current_date,
  echeance date,
  statut text not null default 'Brouillon'
    check (statut in ('Brouillon','Envoyée','Payée','Partiellement payée','En retard','Annulée')),
  montant_regle numeric default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  unique (entreprise_id, numero)
);

create table if not exists public.facture_lignes (
  id uuid primary key default gen_random_uuid(),
  facture_id uuid not null references public.factures(id) on delete cascade,
  produit_id uuid references public.produits(id),
  nom text not null,
  prix_ht numeric not null default 0,
  tva numeric not null default 18,
  qty numeric not null default 1,
  remise numeric not null default 0,
  ordre int default 0
);

create table if not exists public.facture_details (
  id uuid primary key default gen_random_uuid(),
  ligne_id uuid not null references public.facture_lignes(id) on delete cascade,
  label text,
  prix numeric not null default 0
);

create table if not exists public.paiements (
  id uuid primary key default gen_random_uuid(),
  facture_id uuid not null references public.factures(id) on delete cascade,
  montant numeric not null,
  mode text,
  date date default current_date,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  email text not null,
  role public.user_role not null default 'employe',
  invited_by uuid references public.profiles(id),
  accepted boolean not null default false,
  created_at timestamptz default now(),
  unique (entreprise_id, email)
);

create table if not exists public.projets (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  nom text not null,
  description text,
  client_id uuid references public.clients(id),
  statut text not null default 'En cours' check (statut in ('En cours', 'Terminé', 'Annulé')),
  termine_le date,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.depenses (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  categorie text not null,
  description text,
  montant numeric not null check (montant > 0),
  date date not null default current_date,
  mode text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- COLONNES ajoutées par des migrations ultérieures (0002/0004/0006/0007/0009)
-- ---------------------------------------------------------------------
alter table public.entreprises
  add column if not exists preferences jsonb not null default '{
    "notifPaiement": true, "notifEcheance": true, "relanceAuto": false
  }'::jsonb,
  add column if not exists prochain_numero_devis int not null default 1,
  add column if not exists prochain_numero_facture int not null default 1;

update public.entreprises
  set prochain_numero_devis = coalesce(prochain_numero, 1),
      prochain_numero_facture = coalesce(prochain_numero, 1)
  where prochain_numero_devis = 1 and prochain_numero_facture = 1;

alter table public.factures
  add column if not exists projet_termine boolean not null default false,
  add column if not exists termine_le date,
  add column if not exists projet_id uuid references public.projets(id) on delete set null;

alter table public.devis
  add column if not exists projet_id uuid references public.projets(id) on delete set null;

alter table public.clients
  add column if not exists statut text not null default 'Prospect' check (statut in ('Prospect', 'Client'));

do $$ begin
  alter table public.factures
    add constraint projet_termine_requiert_paiement
    check (not projet_termine or statut = 'Payée');
exception when duplicate_object then null;
end $$;

create index if not exists idx_devis_projet on public.devis(projet_id);
create index if not exists idx_factures_projet on public.factures(projet_id);
create index if not exists idx_depenses_entreprise on public.depenses(entreprise_id);
create index if not exists idx_depenses_date on public.depenses(date);

-- ---------------------------------------------------------------------
-- FONCTIONS ET TRIGGER (CREATE OR REPLACE = déjà idempotent)
-- ---------------------------------------------------------------------
create or replace function public.current_entreprise_id()
returns uuid language sql stable security definer set search_path = public as $$
  select entreprise_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'super_admin' from public.profiles where id = auth.uid()), false);
$$;

-- Version finale (post-0003) : vérifie d'abord une invitation en attente
-- pour rejoindre une entreprise existante avec le rôle prévu, sinon crée
-- une nouvelle entreprise avec l'utilisateur comme Administrateur.
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
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY — activation (déjà idempotente) + policies
-- (chaque policy est supprimée puis recréée pour rester idempotente,
-- CREATE POLICY ne supportant pas IF NOT EXISTS en PostgreSQL)
-- ---------------------------------------------------------------------
alter table public.entreprises        enable row level security;
alter table public.profiles           enable row level security;
alter table public.clients            enable row level security;
alter table public.produits           enable row level security;
alter table public.devis              enable row level security;
alter table public.devis_lignes       enable row level security;
alter table public.devis_details      enable row level security;
alter table public.devis_historique   enable row level security;
alter table public.factures           enable row level security;
alter table public.facture_lignes     enable row level security;
alter table public.facture_details    enable row level security;
alter table public.paiements          enable row level security;
alter table public.invitations        enable row level security;
alter table public.projets            enable row level security;
alter table public.depenses           enable row level security;

drop policy if exists "voir sa propre entreprise" on public.entreprises;
create policy "voir sa propre entreprise" on public.entreprises
  for select using (id = public.current_entreprise_id() or public.is_super_admin());
drop policy if exists "admin modifie son entreprise" on public.entreprises;
create policy "admin modifie son entreprise" on public.entreprises
  for update using (id = public.current_entreprise_id() and public.current_role() = 'administrateur');

drop policy if exists "voir les profils de son entreprise" on public.profiles;
create policy "voir les profils de son entreprise" on public.profiles
  for select using (entreprise_id = public.current_entreprise_id() or public.is_super_admin());
drop policy if exists "admin gere les profils de son entreprise" on public.profiles;
create policy "admin gere les profils de son entreprise" on public.profiles
  for update using (entreprise_id = public.current_entreprise_id() and public.current_role() = 'administrateur');
drop policy if exists "utilisateur modifie son propre profil" on public.profiles;
create policy "utilisateur modifie son propre profil" on public.profiles
  for update using (id = auth.uid());

drop policy if exists "clients: lecture entreprise" on public.clients;
create policy "clients: lecture entreprise" on public.clients
  for select using (entreprise_id = public.current_entreprise_id() or public.is_super_admin());
drop policy if exists "clients: ecriture admin/comptable/commercial" on public.clients;
create policy "clients: ecriture admin/comptable/commercial" on public.clients
  for insert with check (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur','comptable','commercial')
  );
drop policy if exists "clients: modification admin/comptable/commercial" on public.clients;
create policy "clients: modification admin/comptable/commercial" on public.clients
  for update using (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur','comptable','commercial')
  );
drop policy if exists "clients: suppression admin" on public.clients;
create policy "clients: suppression admin" on public.clients
  for delete using (entreprise_id = public.current_entreprise_id() and public.current_role() = 'administrateur');

drop policy if exists "produits: lecture entreprise" on public.produits;
create policy "produits: lecture entreprise" on public.produits
  for select using (entreprise_id = public.current_entreprise_id() or public.is_super_admin());
drop policy if exists "produits: ecriture admin/comptable" on public.produits;
create policy "produits: ecriture admin/comptable" on public.produits
  for all using (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur','comptable')
  );

drop policy if exists "devis: lecture selon role" on public.devis;
create policy "devis: lecture selon role" on public.devis
  for select using (
    public.is_super_admin() or (
      entreprise_id = public.current_entreprise_id() and (
        public.current_role() in ('administrateur','comptable','commercial')
        or (public.current_role() = 'employe' and created_by = auth.uid())
      )
    )
  );
drop policy if exists "devis: creation admin/commercial" on public.devis;
create policy "devis: creation admin/commercial" on public.devis
  for insert with check (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur','commercial')
  );
drop policy if exists "devis: modification admin/commercial" on public.devis;
create policy "devis: modification admin/commercial" on public.devis
  for update using (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur','commercial')
  );
drop policy if exists "devis: suppression admin" on public.devis;
create policy "devis: suppression admin" on public.devis
  for delete using (entreprise_id = public.current_entreprise_id() and public.current_role() = 'administrateur');

drop policy if exists "devis_lignes: via devis parent" on public.devis_lignes;
create policy "devis_lignes: via devis parent" on public.devis_lignes
  for all using (exists (select 1 from public.devis d where d.id = devis_id));
drop policy if exists "devis_details: via ligne parente" on public.devis_details;
create policy "devis_details: via ligne parente" on public.devis_details
  for all using (exists (select 1 from public.devis_lignes l where l.id = ligne_id));
drop policy if exists "devis_historique: lecture/ecriture via devis parent" on public.devis_historique;
create policy "devis_historique: lecture/ecriture via devis parent" on public.devis_historique
  for all using (exists (select 1 from public.devis d where d.id = devis_id));

drop policy if exists "factures: lecture selon role" on public.factures;
create policy "factures: lecture selon role" on public.factures
  for select using (
    public.is_super_admin() or (
      entreprise_id = public.current_entreprise_id() and (
        public.current_role() in ('administrateur','comptable')
        or (public.current_role() = 'employe' and created_by = auth.uid())
      )
    )
  );
drop policy if exists "factures: creation admin/comptable" on public.factures;
create policy "factures: creation admin/comptable" on public.factures
  for insert with check (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur','comptable')
  );
drop policy if exists "factures: modification admin/comptable" on public.factures;
create policy "factures: modification admin/comptable" on public.factures
  for update using (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur','comptable')
  );
drop policy if exists "factures: suppression admin" on public.factures;
create policy "factures: suppression admin" on public.factures
  for delete using (entreprise_id = public.current_entreprise_id() and public.current_role() = 'administrateur');

drop policy if exists "facture_lignes: via facture parente" on public.facture_lignes;
create policy "facture_lignes: via facture parente" on public.facture_lignes
  for all using (exists (select 1 from public.factures f where f.id = facture_id));
drop policy if exists "facture_details: via ligne parente" on public.facture_details;
create policy "facture_details: via ligne parente" on public.facture_details
  for all using (exists (select 1 from public.facture_lignes l where l.id = ligne_id));

drop policy if exists "paiements: lecture admin/comptable" on public.paiements;
create policy "paiements: lecture admin/comptable" on public.paiements
  for select using (
    exists (
      select 1 from public.factures f
      where f.id = facture_id
        and f.entreprise_id = public.current_entreprise_id()
        and public.current_role() in ('administrateur','comptable')
    )
  );
drop policy if exists "paiements: creation admin/comptable" on public.paiements;
create policy "paiements: creation admin/comptable" on public.paiements
  for insert with check (
    exists (
      select 1 from public.factures f
      where f.id = facture_id
        and f.entreprise_id = public.current_entreprise_id()
        and public.current_role() in ('administrateur','comptable')
    )
  );

drop policy if exists "invitations: admin gere celles de son entreprise" on public.invitations;
create policy "invitations: admin gere celles de son entreprise" on public.invitations
  for all using (
    entreprise_id = public.current_entreprise_id() and public.current_role() = 'administrateur'
  );

drop policy if exists "projets: lecture entreprise" on public.projets;
create policy "projets: lecture entreprise" on public.projets
  for select using (entreprise_id = public.current_entreprise_id() or public.is_super_admin());
drop policy if exists "projets: creation admin/comptable/commercial" on public.projets;
create policy "projets: creation admin/comptable/commercial" on public.projets
  for insert with check (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur', 'comptable', 'commercial')
  );
drop policy if exists "projets: modification admin/comptable/commercial" on public.projets;
create policy "projets: modification admin/comptable/commercial" on public.projets
  for update using (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur', 'comptable', 'commercial')
  );
drop policy if exists "projets: suppression admin" on public.projets;
create policy "projets: suppression admin" on public.projets
  for delete using (entreprise_id = public.current_entreprise_id() and public.current_role() = 'administrateur');

drop policy if exists "depenses: lecture admin/comptable" on public.depenses;
create policy "depenses: lecture admin/comptable" on public.depenses
  for select using (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur', 'comptable')
  );
drop policy if exists "depenses: creation admin/comptable" on public.depenses;
create policy "depenses: creation admin/comptable" on public.depenses
  for insert with check (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur', 'comptable')
  );
drop policy if exists "depenses: modification admin/comptable" on public.depenses;
create policy "depenses: modification admin/comptable" on public.depenses
  for update using (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur', 'comptable')
  );
drop policy if exists "depenses: suppression admin" on public.depenses;
create policy "depenses: suppression admin" on public.depenses
  for delete using (entreprise_id = public.current_entreprise_id() and public.current_role() = 'administrateur');

-- =====================================================================
-- Fin. Vérifiez ensuite Database → Advisors → Security (aucune alerte
-- ne devrait subsister), puis réessayez l'action qui avait échoué.
-- =====================================================================
