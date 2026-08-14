-- =====================================================================
-- FACTURO — Migration 0008 : Finance (dépenses / sorties de trésorerie)
-- Les entrées existent déjà (table `paiements`, alimentée automatiquement
-- quand une facture est réglée) — cette migration ajoute le pendant
-- manuel pour les sorties d'argent.
-- =====================================================================

create table public.depenses (
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

create index if not exists idx_depenses_entreprise on public.depenses(entreprise_id);
create index if not exists idx_depenses_date on public.depenses(date);

alter table public.depenses enable row level security;

-- Même niveau d'accès que les paiements de factures : la trésorerie est une
-- donnée financière réservée à l'Administrateur et au Comptable.
create policy "depenses: lecture admin/comptable" on public.depenses
  for select using (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur', 'comptable')
  );
create policy "depenses: creation admin/comptable" on public.depenses
  for insert with check (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur', 'comptable')
  );
create policy "depenses: modification admin/comptable" on public.depenses
  for update using (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur', 'comptable')
  );
create policy "depenses: suppression admin" on public.depenses
  for delete using (
    entreprise_id = public.current_entreprise_id() and public.current_role() = 'administrateur'
  );
