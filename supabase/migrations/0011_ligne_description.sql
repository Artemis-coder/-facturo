-- FACTURO — Migration 0011 : description de ligne (non quantifiée)
-- Remplace le principe d'"éléments détaillés" (chacun avec son propre prix)
-- par une simple description libre par ligne, sans impact sur le montant :
-- la ligne garde son prix produit × quantité × remise habituel.
alter table public.devis_lignes add column if not exists description text;
alter table public.facture_lignes add column if not exists description text;
