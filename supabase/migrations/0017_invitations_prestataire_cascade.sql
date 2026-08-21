-- =====================================================================
-- FACTURO — Migration 0017 : Cascade des invitations liées à un prestataire
--
-- Problème : invitations.prestataire_id référence prestataires(id) SANS
-- ON DELETE (voir 0016). Conséquence : la suppression d'un prestataire
-- qui a reçu une invitation échoue avec une erreur de contrainte FK.
--
-- Correction : on delete cascade. Une invitation en attente n'a plus de
-- raison d'être si la fiche prestataire est supprimée. La contrainte
-- unique (entreprise_id, email) est alors libérée, ce qui permet de
-- recréer et réinviter le même prestataire avec la même adresse.
--
-- Les autres FK pointant vers prestataires ont déjà un comportement :
--   - projet_prestataires.prestataire_id : on delete cascade (0014)
--   - taches.prestataire_id              : on delete cascade (0016)
--   - contracts.prestataire_id           : on delete set null (0016)
-- =====================================================================

alter table public.invitations
  drop constraint if exists invitations_prestataire_id_fkey;

alter table public.invitations
  add constraint invitations_prestataire_id_fkey
  foreign key (prestataire_id) references public.prestataires(id) on delete cascade;
