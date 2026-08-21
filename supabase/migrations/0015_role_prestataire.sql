-- =====================================================================
-- FACTURO — Migration 0015 : rôle « prestataire »
-- À exécuter SEUL (commit) avant la migration 0016 : PostgreSQL interdit
-- d'utiliser une valeur d'enum ajoutée dans la même transaction.
-- (Si votre outil échoue avec « ne peut pas s'exécuter dans un bloc de
-- transaction », exécutez cette instruction en autocommit.)
-- =====================================================================

alter type public.user_role add value if not exists 'prestataire';
