-- =====================================================================
-- FACTURO — Migration 0014 : Prestataires
-- Un prestataire est une personne/entité à qui l'on confie une partie
-- d'un projet. Un projet peut avoir plusieurs prestataires, et un
-- prestataire peut intervenir sur plusieurs projets.
-- Les types de projet (domaine d'expertise) et les types de contrat
-- sont des listes fixes.
-- =====================================================================

create table if not exists public.prestataires (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  nom text not null check (char_length(trim(nom)) > 0),
  societe text not null default '',
  email text,
  telephone text,
  notes text,
  type_projet text not null check (type_projet in ('Design graphique', 'Développement web', 'Audiovisuel', 'Marketing', 'Rédaction', 'Autre')),
  type_contrat text not null check (type_contrat in ('Prestation de service', 'Sous-traitance', 'Freelance', 'Partenariat')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projet_prestataires (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  projet_id uuid not null references public.projets(id) on delete cascade,
  prestataire_id uuid not null references public.prestataires(id) on delete cascade,
  mission text not null default '',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (projet_id, prestataire_id)
);

create index if not exists idx_prestataires_entreprise on public.prestataires(entreprise_id, created_at desc);
create index if not exists idx_projet_prestataires_projet on public.projet_prestataires(projet_id);
create index if not exists idx_projet_prestataires_prestataire on public.projet_prestataires(prestataire_id);

alter table public.prestataires enable row level security;
alter table public.projet_prestataires enable row level security;

create policy "prestataires: lecture entreprise" on public.prestataires
  for select using (
    entreprise_id = public.current_entreprise_id() or public.is_super_admin()
  );
create policy "prestataires: creation admin/comptable/commercial" on public.prestataires
  for insert with check (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur', 'comptable', 'commercial')
  );
create policy "prestataires: modification admin/comptable/commercial" on public.prestataires
  for update using (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur', 'comptable', 'commercial')
  );
create policy "prestataires: suppression admin" on public.prestataires
  for delete using (
    entreprise_id = public.current_entreprise_id() and public.current_role() = 'administrateur'
  );

create policy "projet_prestataires: lecture entreprise" on public.projet_prestataires
  for select using (
    entreprise_id = public.current_entreprise_id() or public.is_super_admin()
  );
create policy "projet_prestataires: creation admin/comptable/commercial" on public.projet_prestataires
  for insert with check (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur', 'comptable', 'commercial')
  );
create policy "projet_prestataires: modification admin/comptable/commercial" on public.projet_prestataires
  for update using (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur', 'comptable', 'commercial')
  );
create policy "projet_prestataires: suppression admin" on public.projet_prestataires
  for delete using (
    entreprise_id = public.current_entreprise_id() and public.current_role() = 'administrateur'
  );
