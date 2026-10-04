-- kiril cycle-3 — admin users + role gate
-- All kiril tables use the kiril_ prefix in the public schema (shared hivekit Supabase project).

create table if not exists kiril_admins (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text not null check (role in ('admin', 'operator')),
  full_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table kiril_admins is 'Kiril backend admin users. role=admin (Kiril) has full access; role=operator (Valdas) can confirm/deny bookings only.';

-- RLS: only allow authenticated users to read their own row, no direct writes from client.
alter table kiril_admins enable row level security;

drop policy if exists kiril_admins_self_read on kiril_admins;
create policy kiril_admins_self_read on kiril_admins
  for select
  to authenticated
  using (email = (auth.jwt() ->> 'email'));

-- Seed rows — replace emails via environment at runtime if these prove wrong.
insert into kiril_admins (email, role, full_name)
  values
    ('kingequipmentrental.ca@gmail.com', 'admin', 'Kiril (King Equipment Rental)'),
    ('valdas@ambercastle.ca', 'operator', 'Valdas Jakimavicius (Amber Castle)')
  on conflict (email) do update set role = excluded.role, full_name = excluded.full_name, updated_at = now();
