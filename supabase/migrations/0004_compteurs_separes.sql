-- =====================================================================
-- FACTURO — Migration 0004 : compteurs de numérotation séparés
-- (devis et factures partageaient à tort le même compteur "prochain_numero")
-- À exécuter après les migrations 0001, 0002 et 0003.
-- =====================================================================

alter table public.entreprises
  add column if not exists prochain_numero_devis int not null default 1,
  add column if not exists prochain_numero_facture int not null default 1;

-- Reprend la valeur existante comme point de départ pour les deux compteurs,
-- pour ne pas dupliquer un numéro déjà utilisé.
update public.entreprises
  set prochain_numero_devis = coalesce(prochain_numero, 1),
      prochain_numero_facture = coalesce(prochain_numero, 1)
  where prochain_numero_devis = 1 and prochain_numero_facture = 1;

-- L'ancienne colonne partagée n'est plus utilisée par l'application,
-- mais on la laisse en place (pas de perte de données, pas de rupture).
comment on column public.entreprises.prochain_numero is
  'Obsolète — remplacée par prochain_numero_devis / prochain_numero_facture.';
