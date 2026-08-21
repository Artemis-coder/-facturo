-- =====================================================================
-- FACTURO — Migration 0020 : Fix RLS sous-tâches (projet_id nullable)
--
-- Problème : la policy "taches: creation" de 0016 impose
-- public.is_assigned_to_prestataire(projet_id). Comme les sous-tâches
-- sont insérées avec projet_id = NULL, la vérification échoue et
-- l'insertion est rejetée (erreur 42501).
--
-- Correction : autoriser projet_id IS NULL pour les sous-tâches.
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
          or projet_id is null
        )
      )
    )
  );
