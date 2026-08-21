-- Module contrats : modèles privés, contrats générés et traçabilité.
create table if not exists public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  nom text not null check (char_length(trim(nom)) > 0),
  type_service text not null default '',
  contenu text not null default '',
  source_path text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  template_id uuid references public.contract_templates(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  facture_id uuid references public.factures(id) on delete set null,
  devis_id uuid references public.devis(id) on delete set null,
  projet_id uuid references public.projets(id) on delete set null,
  titre text not null,
  type_service text not null default '',
  statut text not null default 'Brouillon' check (statut in ('Brouillon', 'Envoyé', 'Signé')),
  contenu_final text not null,
  variables jsonb not null default '{}'::jsonb,
  envoye_le date,
  signe_le date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contract_history (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  action text not null,
  detail text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_contract_templates_entreprise on public.contract_templates(entreprise_id, updated_at desc);
create index if not exists idx_contracts_entreprise on public.contracts(entreprise_id, created_at desc);
create index if not exists idx_contracts_client on public.contracts(client_id);

alter table public.contract_templates enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_history enable row level security;

drop policy if exists "contract templates: admin only" on public.contract_templates;
create policy "contract templates: admin only" on public.contract_templates
  for all using (
    entreprise_id = public.current_entreprise_id()
    and (public.current_role() = 'administrateur' or public.is_super_admin())
  ) with check (
    entreprise_id = public.current_entreprise_id()
    and (public.current_role() = 'administrateur' or public.is_super_admin())
  );

drop policy if exists "contracts: admin only" on public.contracts;
create policy "contracts: admin only" on public.contracts
  for all using (
    entreprise_id = public.current_entreprise_id()
    and (public.current_role() = 'administrateur' or public.is_super_admin())
  ) with check (
    entreprise_id = public.current_entreprise_id()
    and (public.current_role() = 'administrateur' or public.is_super_admin())
  );

drop policy if exists "contract history: through contract" on public.contract_history;
create policy "contract history: through contract" on public.contract_history
  for all using (exists (
    select 1 from public.contracts c
    where c.id = contract_id
      and c.entreprise_id = public.current_entreprise_id()
      and (public.current_role() = 'administrateur' or public.is_super_admin())
  )) with check (exists (
    select 1 from public.contracts c
    where c.id = contract_id
      and c.entreprise_id = public.current_entreprise_id()
      and (public.current_role() = 'administrateur' or public.is_super_admin())
  ));

insert into storage.buckets (id, name, public)
values ('contract-sources', 'contract-sources', false)
on conflict (id) do update set public = false;

drop policy if exists "contract sources: admin only" on storage.objects;
create policy "contract sources: admin only" on storage.objects
  for all using (
    bucket_id = 'contract-sources'
    and split_part(name, '/', 1) = public.current_entreprise_id()::text
    and (public.current_role() = 'administrateur' or public.is_super_admin())
  ) with check (
    bucket_id = 'contract-sources'
    and split_part(name, '/', 1) = public.current_entreprise_id()::text
    and (public.current_role() = 'administrateur' or public.is_super_admin())
  );
