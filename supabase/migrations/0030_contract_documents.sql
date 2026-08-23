-- Contract documents versioning: transmitted vs signed PDFs
create table if not exists public.contract_documents (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  version text not null check (version in ('transmitted', 'signed')),
  file_path text not null,
  file_size int,
  mime_type text not null default 'application/pdf',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_contract_documents_contract on public.contract_documents(contract_id, version, created_at desc);

alter table public.contract_documents enable row level security;

drop policy if exists "contract documents: admin and concerned prestataire" on public.contract_documents;
create policy "contract documents: admin and concerned prestataire" on public.contract_documents
  for select using (
    exists (
      select 1 from public.contracts c
      where c.id = contract_id
        and c.entreprise_id = public.current_entreprise_id()
        and (
          public.current_role() = 'administrateur'
          or public.is_super_admin()
          or c.prestataire_id = (
            select id from public.prestataires where user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "contract documents: admin insert" on public.contract_documents;
create policy "contract documents: admin insert" on public.contract_documents
  for insert with check (
    exists (
      select 1 from public.contracts c
      where c.id = contract_id
        and c.entreprise_id = public.current_entreprise_id()
        and (public.current_role() = 'administrateur' or public.is_super_admin())
    )
  );

insert into storage.buckets (id, name, public)
values ('contract-documents', 'contract-documents', false)
on conflict (id) do update set public = false;

drop policy if exists "contract documents storage: admin and prestataire" on storage.objects;
create policy "contract documents storage: admin and prestataire" on storage.objects
  for all using (
    bucket_id = 'contract-documents'
    and split_part(name, '/', 1) = public.current_entreprise_id()::text
    and (
      public.current_role() = 'administrateur'
      or public.is_super_admin()
      or exists (
        select 1 from public.contract_documents cd
        join public.contracts c on c.id = cd.contract_id
        where cd.file_path = name
          and c.prestataire_id = (
            select id from public.prestataires where user_id = auth.uid()
          )
      )
    )
  ) with check (
    bucket_id = 'contract-documents'
    and split_part(name, '/', 1) = public.current_entreprise_id()::text
    and (
      public.current_role() = 'administrateur'
      or public.is_super_admin()
    )
  );
