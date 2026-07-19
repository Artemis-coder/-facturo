-- =====================================================================
-- FACTURO — Migration de rattrapage (0002 + 0004 réunies)
-- À exécuter dans Supabase → SQL Editor → New query → Run.
-- Sans danger si une partie existe déjà (tout est en "if not exists").
-- =====================================================================

-- Préférences de notification (corrige : "Could not find the 'preferences' column")
alter table public.entreprises
  add column if not exists preferences jsonb not null default '{
    "notifPaiement": true,
    "notifEcheance": true,
    "relanceAuto": false
  }'::jsonb;

-- Compteurs de numérotation séparés pour devis et factures
alter table public.entreprises
  add column if not exists prochain_numero_devis int not null default 1,
  add column if not exists prochain_numero_facture int not null default 1;

update public.entreprises
  set prochain_numero_devis = coalesce(prochain_numero, 1),
      prochain_numero_facture = coalesce(prochain_numero, 1)
  where prochain_numero_devis = 1 and prochain_numero_facture = 1;
