-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users Table
create table public.users (
  id uuid not null default uuid_generate_v4(),
  username text not null,
  created_at timestamp with time zone not null default now(),
  is_admin boolean default false,
  constraint users_pkey primary key (id),
  constraint users_username_key unique (username)
);

-- Checkins Table
create table public.checkins (
  id uuid not null default uuid_generate_v4(),
  user_id uuid not null,
  date date not null,
  created_at timestamp with time zone not null default now(),
  constraint checkins_pkey primary key (id),
  constraint checkins_user_id_fkey foreign key (user_id) references users (id) on delete cascade,
  constraint checkins_user_date_unique unique (user_id, date)
);

-- Challenge Settings Table
create table public.challenge_settings (
  key text not null,
  value text not null,
  constraint challenge_settings_pkey primary key (key)
);

-- Row Level Security (RLS)
-- For this simple app, we might allow public read/write if we trust the group, 
-- or implement simple policies based on username presence if we had auth.
-- Since we are doing "name based" auth without passwords, we can enable RLS but allow public access for MVP 
-- or restrict writes to "authenticated" if we used real auth.
-- Given the requirement: "Users should NOT need email or passwords", we will likely use client-side logic + potentially open RLS or RLS that allows anon inserts if name matches? 
-- Actually, best to keep it open for the "Squad" or maybe minimal security.
-- Adding basic policies for public access since usage is "frictionless".

alter table public.users enable row level security;
alter table public.checkins enable row level security;
alter table public.challenge_settings enable row level security;

-- Policies (Allow all for now, can be tightened)
create policy "Allow public access to users" on public.users for all using (true) with check (true);
create policy "Allow public access to checkins" on public.checkins for all using (true) with check (true);
create policy "Allow public read settings" on public.challenge_settings for select using (true);
-- Only admin should write settings, but we can seed initially.

-- Seed initial start date
insert into public.challenge_settings (key, value) values ('start_date', '2026-01-31') on conflict do nothing;
