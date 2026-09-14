-- RealtyFlow AI v0.4 migration
-- Run this in Supabase SQL Editor if you already installed v0.2/v0.3.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  channel text not null default 'AI Chat',
  status text not null default 'Open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  message_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists conversations_business_id_idx on public.conversations(business_id);
create index if not exists conversation_messages_conversation_id_idx on public.conversation_messages(conversation_id);

alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;

drop policy if exists "members manage conversations" on public.conversations;
create policy "members manage conversations" on public.conversations
for all to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

drop policy if exists "members manage conversation messages" on public.conversation_messages;
create policy "members manage conversation messages" on public.conversation_messages
for all to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));
