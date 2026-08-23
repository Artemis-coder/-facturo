-- Hard delete policies for contracts module
-- Cascade delete is already configured via foreign keys with ON DELETE CASCADE

drop policy if exists "contracts: admin delete" on public.contracts;
create policy "contracts: admin delete" on public.contracts
  for delete using (
    entreprise_id = public.current_entreprise_id()
    and (public.current_role() = 'administrateur' or public.is_super_admin())
  );

drop policy if exists "contract templates: admin delete" on public.contract_templates;
create policy "contract templates: admin delete" on public.contract_templates
  for delete using (
    entreprise_id = public.current_entreprise_id()
    and (public.current_role() = 'administrateur' or public.is_super_admin())
  );

drop policy if exists "contract history: admin delete" on public.contract_history;
create policy "contract history: admin delete" on public.contract_history
  for delete using (
    exists (
      select 1 from public.contracts c
      where c.id = contract_id
        and c.entreprise_id = public.current_entreprise_id()
        and (public.current_role() = 'administrateur' or public.is_super_admin())
    )
  );

drop policy if exists "contract documents: admin delete" on public.contract_documents;
create policy "contract documents: admin delete" on public.contract_documents
  for delete using (
    exists (
      select 1 from public.contracts c
      where c.id = contract_id
        and c.entreprise_id = public.current_entreprise_id()
        and (public.current_role() = 'administrateur' or public.is_super_admin())
    )
  );
