-- =====================================================================
-- FACTURO — Migration 0007 : Projets (regroupement de devis/factures)
-- Permet de créer un projet en amont puis d'y rattacher des devis/factures,
-- ou de rattacher rétroactivement un devis/une facture déjà existant(e).
-- =====================================================================

create table public.projets (
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

-- Un devis ou une facture peut appartenir à au plus un projet ; si le projet
-- est supprimé, le devis/la facture n'est pas perdu(e) — il/elle redevient
-- simplement non rattaché(e).
alter table public.devis
  add column if not exists projet_id uuid references public.projets(id) on delete set null;

alter table public.factures
  add column if not exists projet_id uuid references public.projets(id) on delete set null;

create index if not exists idx_devis_projet on public.devis(projet_id);
create index if not exists idx_factures_projet on public.factures(projet_id);

alter table public.projets enable row level security;

-- Mêmes permissions que pour les clients : lecture entreprise pour
-- admin/comptable/commercial, écriture pour ces mêmes rôles, suppression
-- réservée à l'Administrateur.
create policy "projets: lecture entreprise" on public.projets
  for select using (
    entreprise_id = public.current_entreprise_id() or public.is_super_admin()
  );
create policy "projets: creation admin/comptable/commercial" on public.projets
  for insert with check (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur', 'comptable', 'commercial')
  );
create policy "projets: modification admin/comptable/commercial" on public.projets
  for update using (
    entreprise_id = public.current_entreprise_id()
    and public.current_role() in ('administrateur', 'comptable', 'commercial')
  );
create policy "projets: suppression admin" on public.projets
  for delete using (
    entreprise_id = public.current_entreprise_id() and public.current_role() = 'administrateur'
  );
