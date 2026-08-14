-- =====================================================================
-- FACTURO — Migration 0003 : invitations d'équipe (rôles)
-- À exécuter après les migrations 0001 et 0002.
-- =====================================================================

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  email text not null,
  role public.user_role not null default 'employe',
  invited_by uuid references public.profiles(id),
  accepted boolean not null default false,
  created_at timestamptz default now(),
  unique (entreprise_id, email)
);

alter table public.invitations enable row level security;

create policy "invitations: admin gere celles de son entreprise" on public.invitations
  for all using (
    entreprise_id = public.current_entreprise_id() and public.current_role() = 'administrateur'
  );

-- Remplace le trigger d'inscription : si une invitation en attente existe pour
-- l'e-mail utilisé, l'utilisateur rejoint CETTE entreprise avec le rôle prévu,
-- au lieu de créer sa propre entreprise.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_entreprise_id uuid;
  invite record;
  assigned_role public.user_role;
begin
  select * into invite from public.invitations
    where lower(email) = lower(new.email) and accepted = false
    limit 1;

  if invite.id is not null then
    new_entreprise_id := invite.entreprise_id;
    assigned_role := invite.role;
    update public.invitations set accepted = true where id = invite.id;
  else
    insert into public.entreprises (nom)
    values (coalesce(new.raw_user_meta_data->>'entreprise_nom', 'Mon entreprise'))
    returning id into new_entreprise_id;
    assigned_role := 'administrateur';
  end if;

  insert into public.profiles (id, entreprise_id, nom_complet, email, role)
  values (
    new.id, new_entreprise_id,
    coalesce(new.raw_user_meta_data->>'nom_complet', new.email),
    new.email, assigned_role
  );
  return new;
end;
$$;
