-- =====================================================================
-- FACTURO — Migration 0021 : RLS sous-tâches via tâche parente
--
-- Les sous-tâches héritent du projet_id de leur tâche parente (obligé :
-- la colonne projet_id est NOT NULL) et de la fiche prestataire du compte
-- connecté. Le cas standard passe déjà le is_assigned_to_prestataire().
--
-- Cas limite couvert ici : la tâche parente a été créée par l'admin sur
-- un projet qui n'apparaît pas dans projet_prestataires pour ce
-- prestataire → on autorise l'insertion si le parent appartient bien au
-- prestataire courant (même entreprise imposée par la première clause).
-- =====================================================================

drop policy if exists "taches: creation" on public.taches;

create policy "taches: creation" on public.taches
  for insert with check (
    entreprise_id = public.current_entreprise_id()
    and (
      public.current_role() in ('administrateur', 'comptable', 'commercial')
      or (
        public.current_role() = 'prestataire'
        and prestataire_id = public.current_prestataire_id()
        and (
          public.is_assigned_to_prestataire(projet_id)
          or exists (
            select 1 from public.taches p
            where p.id = parent_task_id
              and p.prestataire_id = public.current_prestataire_id()
          )
        )
      )
    )
  );
