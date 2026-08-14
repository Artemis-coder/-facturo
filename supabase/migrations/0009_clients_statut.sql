-- =====================================================================
-- FACTURO — Migration 0009 : statut Prospect / Client
-- Permet de distinguer les prospects des clients validés, pour le
-- tableau de bord du profil Commercial.
-- =====================================================================

alter table public.clients
  add column if not exists statut text not null default 'Prospect'
  check (statut in ('Prospect', 'Client'));
