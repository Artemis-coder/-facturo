-- =====================================================================
-- FACTURO — Schéma initial, rôles utilisateurs et sécurité (RLS)
-- À exécuter dans Supabase → SQL Editor → New query → Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Extensions
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 2. Rôles applicatifs
-- ---------------------------------------------------------------------
-- super_admin    : accès à toutes les entreprises (support/plateforme Facturo)
-- administrateur : accès complet à SA propre entreprise (utilisateurs, paramètres, tout)
-- comptable      : factures, paiements, rapports — pas de gestion des utilisateurs
-- commercial     : devis, clients — pas d'accès aux paiements/rapports financiers
-- employe        : lecture seule sur ses propres devis/factures
create type public.user_role as enum (
  'super_admin', 'administrateur', 'comptable', 'commercial', 'employe'
);

-- ---------------------------------------------------------------------
-- 3. Entreprises (multi-tenant)
-- ---------------------------------------------------------------------
create table public.entreprises (
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

-- ---------------------------------------------------------------------
-- 4. Profils utilisateurs (1-1 avec auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  entreprise_id uuid references public.entreprises(id) on delete cascade,
  nom_complet text,
  email text,
  role public.user_role not null default 'administrateur',
  created_at timestamptz default now()
);

-- Fonctions utilitaires utilisées par les policies RLS.
-- security definer + search_path fixe pour éviter les problèmes de récursion RLS.
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

-- Création automatique du profil + de l'entreprise à l'inscription.
-- Le nom de l'entreprise et de l'utilisateur sont passés via
-- `options.data` lors de supabase.auth.signUp(...).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_entreprise_id uuid;
begin
  insert into public.entreprises (nom)
  values (coalesce(new.raw_user_meta_data->>'entreprise_nom', 'Mon entreprise'))
  returning id into new_entreprise_id;

  insert into public.profiles (id, entreprise_id, nom_complet, email, role)
  values (
    new.id,
    new_entreprise_id,
    coalesce(new.raw_user_meta_data->>'nom_complet', new.email),
    new.email,
    'administrateur'  -- le créateur du compte est admin de sa propre entreprise
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 5. Clients
-- ---------------------------------------------------------------------
create table public.clients (
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

-- ---------------------------------------------------------------------
-- 6. Produits & services
-- ---------------------------------------------------------------------
create table public.produits (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  nom text not null,
  categorie text,
  prix_ht numeric not null default 0,
  tva numeric not null default 18,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 7. Devis
-- ---------------------------------------------------------------------
create table public.devis (
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

create table public.devis_lignes (
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

create table public.devis_details (
  id uuid primary key default gen_random_uuid(),
  ligne_id uuid not null references public.devis_lignes(id) on delete cascade,
  label text,
  prix numeric not null default 0
);

create table public.devis_historique (
  id uuid primary key default gen_random_uuid(),
  devis_id uuid not null references public.devis(id) on delete cascade,
  date date default current_date,
  action text not null,
  detail text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 8. Factures
-- ---------------------------------------------------------------------
create table public.factures (
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

create table public.facture_lignes (
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

create table public.facture_details (
  id uuid primary key default gen_random_uuid(),
  ligne_id uuid not null references public.facture_lignes(id) on delete cascade,
  label text,
  prix numeric not null default 0
);

create table public.paiements (
  id uuid primary key default gen_random_uuid(),
  facture_id uuid not null references public.factures(id) on delete cascade,
  montant numeric not null,
  mode text,
  date date default current_date,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- =====================================================================
-- 9. Row Level Security — isolation par entreprise + permissions par rôle
-- =====================================================================
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

-- --- entreprises ---
create policy "voir sa propre entreprise" on public.entreprises
  for select using (id = public.current_entreprise_id() or public.is_super_admin());
create policy "admin modifie son entreprise" on public.entreprises
  for update using (id = public.current_entreprise_id() and public.current_role() = 'administrateur');

-- --- profiles ---
create policy "voir les profils de son entreprise" on public.profiles
  for select using (entreprise_id = public.current_entreprise_id() or public.is_super_admin());
create policy "admin gere les profils de son entreprise" on public.profiles
  for update using (entreprise_id = public.current_entreprise_id() and public.current_role() = 'administrateur');
create policy "utilisateur modifie son propre profil" on public.profiles
  for update using (id = auth.uid());

-- --- clients : lecture entreprise, écriture admin/comptable/commercial ---
create policy "clients: lecture entreprise" on public.clients
  for select using (entreprise_id = public.current_entreprise_id() or public.is_super_admin());
create policy "clients: ecriture admin/comptable/commercial" on public.clients
  for insert with check (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur','comptable','commercial')
  );
create policy "clients: modification admin/comptable/commercial" on public.clients
  for update using (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur','comptable','commercial')
  );
create policy "clients: suppression admin" on public.clients
  for delete using (entreprise_id = public.current_entreprise_id() and public.current_role() = 'administrateur');

-- --- produits : lecture entreprise, écriture admin/comptable ---
create policy "produits: lecture entreprise" on public.produits
  for select using (entreprise_id = public.current_entreprise_id() or public.is_super_admin());
create policy "produits: ecriture admin/comptable" on public.produits
  for all using (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur','comptable')
  );

-- --- devis : commercial/admin créent, employé voit seulement les siens ---
create policy "devis: lecture selon role" on public.devis
  for select using (
    public.is_super_admin() or (
      entreprise_id = public.current_entreprise_id() and (
        public.current_role() in ('administrateur','comptable','commercial')
        or (public.current_role() = 'employe' and created_by = auth.uid())
      )
    )
  );
create policy "devis: creation admin/commercial" on public.devis
  for insert with check (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur','commercial')
  );
create policy "devis: modification admin/commercial" on public.devis
  for update using (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur','commercial')
  );
create policy "devis: suppression admin" on public.devis
  for delete using (entreprise_id = public.current_entreprise_id() and public.current_role() = 'administrateur');

-- Lignes/détails/historique de devis héritent de la policy du devis parent.
create policy "devis_lignes: via devis parent" on public.devis_lignes
  for all using (exists (select 1 from public.devis d where d.id = devis_id));
create policy "devis_details: via ligne parente" on public.devis_details
  for all using (exists (select 1 from public.devis_lignes l where l.id = ligne_id));
create policy "devis_historique: lecture/ecriture via devis parent" on public.devis_historique
  for all using (exists (select 1 from public.devis d where d.id = devis_id));

-- --- factures : comptable/admin gèrent, commercial n'a pas accès, employé lecture des siennes ---
create policy "factures: lecture selon role" on public.factures
  for select using (
    public.is_super_admin() or (
      entreprise_id = public.current_entreprise_id() and (
        public.current_role() in ('administrateur','comptable')
        or (public.current_role() = 'employe' and created_by = auth.uid())
      )
    )
  );
create policy "factures: creation admin/comptable" on public.factures
  for insert with check (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur','comptable')
  );
create policy "factures: modification admin/comptable" on public.factures
  for update using (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur','comptable')
  );
create policy "factures: suppression admin" on public.factures
  for delete using (entreprise_id = public.current_entreprise_id() and public.current_role() = 'administrateur');

create policy "facture_lignes: via facture parente" on public.facture_lignes
  for all using (exists (select 1 from public.factures f where f.id = facture_id));
create policy "facture_details: via ligne parente" on public.facture_details
  for all using (exists (select 1 from public.facture_lignes l where l.id = ligne_id));

-- --- paiements : admin/comptable uniquement ---
create policy "paiements: lecture admin/comptable" on public.paiements
  for select using (
    exists (
      select 1 from public.factures f
      where f.id = facture_id
        and f.entreprise_id = public.current_entreprise_id()
        and public.current_role() in ('administrateur','comptable')
    )
  );
create policy "paiements: creation admin/comptable" on public.paiements
  for insert with check (
    exists (
      select 1 from public.factures f
      where f.id = facture_id
        and f.entreprise_id = public.current_entreprise_id()
        and public.current_role() in ('administrateur','comptable')
    )
  );

-- =====================================================================
-- Fin du script. Vérifiez ensuite : Database → Advisors → Security
-- pour confirmer qu'aucune alerte RLS ne subsiste.
-- =====================================================================
