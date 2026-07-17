-- =====================================================================
-- FACTURO — Migration 0002 : préférences (notifications) par entreprise
-- À exécuter dans Supabase → SQL Editor, après la migration 0001.
-- =====================================================================

alter table public.entreprises
  add column if not exists preferences jsonb not null default '{
    "notifPaiement": true,
    "notifEcheance": true,
    "relanceAuto": false
  }'::jsonb;
