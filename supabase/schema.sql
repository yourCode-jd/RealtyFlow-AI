-- RealtyFlow AI v0.2 database schema
-- Run this once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  phone text not null,
  source text not null default 'Website',
  budget_lakh numeric(12,2),
  preferred_location text,
  property_type text,
  bhk text,
  buying_timeline text,
  financing text,
  status text not null default 'New',
  score text not null default 'Warm',
  next_followup date,
  salesperson text default 'Unassigned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  project text not null,
  location text not null,
  price_min_lakh numeric(12,2),
  price_max_lakh numeric(12,2),
  bhk text,
  property_type text,
  possession text,
  created_at timestamptz not null default now()
);

create table if not exists public.site_visits (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  visit_date date not null,
  visit_time time not null,
  status text not null default 'Confirmed',
  created_at timestamptz not null default now()
);

create index if not exists leads_business_id_idx on public.leads(business_id);
create index if not exists properties_business_id_idx on public.properties(business_id);
create index if not exists site_visits_business_id_idx on public.site_visits(business_id);
create index if not exists site_visits_lead_id_idx on public.site_visits(lead_id);

-- Security-definer helper avoids recursive RLS checks on membership table.
create or replace function public.is_business_member(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.business_members bm
    where bm.business_id = target_business_id
      and bm.user_id = auth.uid()
  );
$$;

revoke all on function public.is_business_member(uuid) from public;
grant execute on function public.is_business_member(uuid) to authenticated;

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.leads enable row level security;
alter table public.properties enable row level security;
alter table public.site_visits enable row level security;

drop policy if exists "members can view businesses" on public.businesses;
create policy "members can view businesses" on public.businesses
for select to authenticated
using (public.is_business_member(id));

drop policy if exists "members can view membership" on public.business_members;
create policy "members can view membership" on public.business_members
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "members manage leads" on public.leads;
create policy "members manage leads" on public.leads
for all to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

drop policy if exists "members manage properties" on public.properties;
create policy "members manage properties" on public.properties
for all to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

drop policy if exists "members manage site visits" on public.site_visits;
create policy "members manage site visits" on public.site_visits
for all to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

-- Create one workspace for each newly registered owner and preload 3 demo properties.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_business_id uuid;
  business_name text;
begin
  business_name := coalesce(new.raw_user_meta_data->>'business_name', 'My Real Estate Business');

  insert into public.businesses (name)
  values (business_name)
  returning id into new_business_id;

  insert into public.business_members (business_id, user_id, role)
  values (new_business_id, new.id, 'owner');

  insert into public.properties (business_id, project, location, price_min_lakh, price_max_lakh, bhk, property_type, possession)
  values
    (new_business_id, 'Skyline Residency', 'Sector 79, Gurugram', 85, 110, '3 BHK', 'Apartment', 'Ready to Move'),
    (new_business_id, 'Green Avenue', 'Sector 92, Gurugram', 65, 82, '2 BHK', 'Apartment', 'Dec 2027'),
    (new_business_id, 'Aravali Heights', 'Sector 77, Gurugram', 95, 135, '3 BHK', 'Apartment', 'Mar 2027');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- v0.4 AI qualification conversations
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
