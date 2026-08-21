-- =====================================================================
-- FACTURO — Migration 0019 : Sous-tâches + traçabilité des tâches
--
-- Ajoute :
--  - taches.parent_task_id : hiérarchie parent/enfant (sous-tâches)
--  - tache_historique : journal immuable des modifications
--  - triggers de log automatiques
-- =====================================================================

-- 1. Colonne de hiérarchie
alter table public.taches
  add column if not exists parent_task_id uuid references public.taches(id) on delete cascade;

create index if not exists idx_taches_parent on public.taches(parent_task_id);

-- 2. Table d'historique
create table if not exists public.tache_historique (
  id uuid primary key default gen_random_uuid(),
  tache_id uuid not null references public.taches(id) on delete cascade,
  type text not null check (type in (
    'tache_creer',
    'tache_modifier',
    'tache_supprimer',
    'statut',
    'sous_tache_ajoutee',
    'sous_tache_supprimee'
  )),
  ancienne_valeur text,
  nouvelle_valeur text,
  changed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_tache_historique_tache on public.tache_historique(tache_id, created_at desc);

alter table public.tache_historique enable row level security;

-- 3. Trigger de log
create or replace function public.log_tache_changes()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_old jsonb := to_jsonb(OLD);
  v_new jsonb := to_jsonb(NEW);
  v_user_id uuid := auth.uid();
  v_type text;
begin
  if TG_OP = 'INSERT' then
    v_type := 'tache_creer';
    insert into public.tache_historique (tache_id, type, nouvelle_valeur, changed_by)
    values (NEW.id, v_type, NEW.titre, v_user_id);
  elsif TG_OP = 'UPDATE' then
    if v_old->>'statut' is distinct from v_new->>'statut' then
      insert into public.tache_historique (tache_id, type, ancienne_valeur, nouvelle_valeur, changed_by)
      values (NEW.id, 'statut', v_old->>'statut', v_new->>'statut', v_user_id);
    end if;
    if v_old is distinct from v_new and v_old->>'statut' is not distinct from v_new->>'statut' then
      insert into public.tache_historique (tache_id, type, changed_by)
      values (NEW.id, 'tache_modifier', v_user_id);
    end if;
  elsif TG_OP = 'DELETE' then
    insert into public.tache_historique (tache_id, type, ancienne_valeur, changed_by)
    values (OLD.id, 'tache_supprimer', OLD.titre, v_user_id);
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_log_tache_changes on public.taches;
create trigger trg_log_tache_changes
  after insert or update or delete on public.taches
  for each row execute function public.log_tache_changes();

-- 4. Trigger pour les sous-tâches (via parent_task_id)
create or replace function public.log_sous_tache_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' and NEW.parent_task_id is not null then
    insert into public.tache_historique (tache_id, type, nouvelle_valeur, changed_by)
    values (NEW.parent_task_id, 'sous_tache_ajoutee', NEW.titre, auth.uid());
  elsif TG_OP = 'DELETE' and OLD.parent_task_id is not null then
    insert into public.tache_historique (tache_id, type, ancienne_valeur, changed_by)
    values (OLD.parent_task_id, 'sous_tache_supprimee', OLD.titre, auth.uid());
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_log_sous_tache_changes on public.taches;
create trigger trg_log_sous_tache_changes
  after insert or delete on public.taches
  for each row execute function public.log_sous_tache_changes();

-- 5. RLS sur tache_historique
create policy "tache_historique: lecture admin/comptable/commercial"
  on public.tache_historique for select using (
    exists (
      select 1 from public.taches t
      join public.profiles p on p.entreprise_id = t.entreprise_id
      where t.id = tache_historique.tache_id
        and p.id = auth.uid()
        and p.role in ('administrateur', 'comptable', 'commercial')
    )
  );

create policy "tache_historique: lecture prestataire propriétaire"
  on public.tache_historique for select using (
    exists (
      select 1 from public.taches t
      where t.id = tache_historique.tache_id
        and t.prestataire_id = public.current_prestataire_id()
    )
  );

create policy "tache_historique: aucun write"
  on public.tache_historique for all using (false);
