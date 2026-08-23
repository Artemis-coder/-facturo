-- Module de messagerie instantanée avec notifications temps réel
-- Tables : messages, message_reactions
-- Bucket : chat-attachments pour les fichiers joints

create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  prestataire_id uuid references public.prestataires(id) on delete set null,
  contract_id uuid references public.contracts(id) on delete set null,
  projet_id uuid references public.projets(id) on delete set null,
  contenu text not null default '',
  type text not null default 'text' check (type in ('text', 'file', 'system')),
  metadata jsonb not null default '{}'::jsonb,
  lu boolean not null default false,
  lu_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) > 0),
  created_at timestamptz not null default now(),
  unique(message_id, user_id, emoji)
);

create index if not exists idx_messages_entreprise_recipient on public.messages(entreprise_id, recipient_id, created_at desc);
create index if not exists idx_messages_sender on public.messages(sender_id, created_at desc);
create index if not exists idx_messages_prestataire on public.messages(prestataire_id, created_at desc);
create index if not exists idx_message_reactions_message on public.message_reactions(message_id);

alter table public.messages enable row level security;
alter table public.message_reactions enable row level security;

drop policy if exists "messages: participants only" on public.messages;
create policy "messages: participants only" on public.messages
  for all using (
    entreprise_id = public.current_entreprise_id()
    and (
      public.current_role() in ('administrateur', 'comptable', 'commercial', 'super_admin')
      or sender_id = public.current_user_id()
      or recipient_id = public.current_user_id()
    )
  ) with check (
    entreprise_id = public.current_entreprise_id()
    and (
      public.current_role() in ('administrateur', 'comptable', 'commercial', 'super_admin')
      or sender_id = public.current_user_id()
    )
  );

drop policy if exists "message reactions: participants only" on public.message_reactions;
create policy "message reactions: participants only" on public.message_reactions
  for all using (
    exists (
      select 1 from public.messages m
      where m.id = message_id
        and m.entreprise_id = public.current_entreprise_id()
        and (
          public.current_role() in ('administrateur', 'comptable', 'commercial', 'super_admin')
          or m.sender_id = public.current_user_id()
          or m.recipient_id = public.current_user_id()
        )
    )
  ) with check (
    exists (
      select 1 from public.messages m
      where m.id = message_id
        and m.entreprise_id = public.current_entreprise_id()
        and (
          public.current_role() in ('administrateur', 'comptable', 'commercial', 'super_admin')
          or m.sender_id = public.current_user_id()
        )
    )
  );

insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', false)
on conflict (id) do update set public = false;

drop policy if exists "chat attachments: participants" on storage.objects;
create policy "chat attachments: participants" on storage.objects
  for all using (
    bucket_id = 'chat-attachments'
    and split_part(name, '/', 1) = public.current_entreprise_id()::text
    and (
      public.current_role() in ('administrateur', 'comptable', 'commercial', 'super_admin')
      or exists (
        select 1 from public.messages m
        where m.metadata->>'filePath' = name
          and (m.sender_id = public.current_user_id() or m.recipient_id = public.current_user_id())
      )
    )
  ) with check (
    bucket_id = 'chat-attachments'
    and split_part(name, '/', 1) = public.current_entreprise_id()::text
    and (
      public.current_role() in ('administrateur', 'comptable', 'commercial', 'super_admin')
      or exists (
        select 1 from public.messages m
        where m.sender_id = public.current_user_id()
      )
    )
  );
