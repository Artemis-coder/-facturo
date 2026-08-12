-- FACTURO — Migration 0012 : logo d'entreprise (Supabase Storage)
alter table public.entreprises add column if not exists logo_url text;

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Lecture publique (le logo doit s'afficher sur les documents envoyés aux clients).
drop policy if exists "logos: lecture publique" on storage.objects;
create policy "logos: lecture publique" on storage.objects
  for select using (bucket_id = 'logos');

-- Écriture réservée à l'Administrateur de l'entreprise, dans son propre
-- dossier (le chemin uploadé doit commencer par "<entreprise_id>/").
drop policy if exists "logos: ecriture admin" on storage.objects;
create policy "logos: ecriture admin" on storage.objects
  for insert with check (
    bucket_id = 'logos'
    and public.current_role() = 'administrateur'
    and (storage.foldername(name))[1] = public.current_entreprise_id()::text
  );

drop policy if exists "logos: modification admin" on storage.objects;
create policy "logos: modification admin" on storage.objects
  for update using (
    bucket_id = 'logos'
    and public.current_role() = 'administrateur'
    and (storage.foldername(name))[1] = public.current_entreprise_id()::text
  );

drop policy if exists "logos: suppression admin" on storage.objects;
create policy "logos: suppression admin" on storage.objects
  for delete using (
    bucket_id = 'logos'
    and public.current_role() = 'administrateur'
    and (storage.foldername(name))[1] = public.current_entreprise_id()::text
  );
