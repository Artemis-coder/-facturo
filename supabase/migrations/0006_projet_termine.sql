-- =====================================================================
-- FACTURO — Migration 0006 : projets terminés
-- Un projet ne peut être marqué "terminé" que si la facture est entièrement
-- payée — la contrainte est imposée au niveau de la base, pas seulement
-- dans l'interface.
-- =====================================================================

alter table public.factures
  add column if not exists projet_termine boolean not null default false,
  add column if not exists termine_le date;

alter table public.factures
  drop constraint if exists projet_termine_requiert_paiement;

alter table public.factures
  add constraint projet_termine_requiert_paiement
  check (not projet_termine or statut = 'Payée');
