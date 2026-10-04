-- kiril cycle-4 — equipment, bookings, availability, invoices, settings

create table if not exists kiril_equipment (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  short_name text not null,
  daily_rate_cents int not null,
  weekly_rate_cents int,
  monthly_rate_cents int,
  operator_daily_rate_cents int,
  active boolean not null default true,
  created_at timestamptz default now()
);

comment on table kiril_equipment is 'Rentable equipment. New units = new row; no code change.';

create table if not exists kiril_bookings (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid references kiril_equipment(id) on delete restrict,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  customer_address text not null,
  start_date date not null,
  end_date date not null,
  operator boolean not null default false,
  delivery_zone text not null check (delivery_zone in ('king-township','gta','other')),
  notes text,
  status text not null check (status in ('pending','confirmed','denied','completed','cancelled')) default 'pending',
  google_calendar_event_id text,
  confirmed_at timestamptz,
  confirmed_by text,
  denied_at timestamptz,
  denied_by text,
  denied_reason text,
  source text,
  ip text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  check (end_date >= start_date)
);

create index if not exists kiril_bookings_status_idx on kiril_bookings(status);
create index if not exists kiril_bookings_dates_idx on kiril_bookings(start_date, end_date);

create table if not exists kiril_availability (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references kiril_equipment(id) on delete cascade,
  date date not null,
  status text not null check (status in ('booked','blocked','maintenance')),
  source text not null check (source in ('manual','booking')),
  reason text,
  booking_id uuid references kiril_bookings(id) on delete cascade,
  created_at timestamptz default now(),
  unique(equipment_id, date)
);

create index if not exists kiril_availability_date_idx on kiril_availability(date);

create table if not exists kiril_invoices (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references kiril_bookings(id) on delete cascade,
  kind text not null check (kind in ('deposit','balance','custom')),
  subtotal_cents int not null,
  tax_cents int not null default 0,
  discount_cents int not null default 0,
  total_cents int not null,
  currency text not null default 'CAD',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_payment_link_url text,
  status text not null check (status in ('draft','issued','paid','void','refunded')) default 'draft',
  paid_at timestamptz,
  paid_method text check (paid_method in ('stripe','e-transfer','manual','other')),
  paid_reference text,
  emailed_at timestamptz,
  email_message_id text,
  memo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists kiril_invoices_status_idx on kiril_invoices(status);
create index if not exists kiril_invoices_booking_idx on kiril_invoices(booking_id);

create table if not exists kiril_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

comment on table kiril_settings is 'Admin-editable key-value store. Keys: tax_rate, discounts.google_review, delivery_fee_gta_cents, etc.';

-- RLS: all these tables are admin-only. Deny by default; server code uses
-- service role for reads/writes on the backend surface. Public endpoints
-- (POST /api/book, GET /api/availability, GET /api/calendar.ics) use their
-- own auth (rate limit + ical secret token) so they don't need RLS.
alter table kiril_equipment enable row level security;
alter table kiril_bookings enable row level security;
alter table kiril_availability enable row level security;
alter table kiril_invoices enable row level security;
alter table kiril_settings enable row level security;

-- Seed the mini stand-on loader (from config/site.json).
-- Rates in cents CAD.
insert into kiril_equipment (slug, name, short_name, daily_rate_cents, weekly_rate_cents, monthly_rate_cents, operator_daily_rate_cents, active)
  values ('mini-stand-on', 'Mini stand-on track loader', 'Mini stand-on loader', 24999, 104993, 299970, 29999, true)
  on conflict (slug) do update set
    name = excluded.name,
    short_name = excluded.short_name,
    daily_rate_cents = excluded.daily_rate_cents,
    weekly_rate_cents = excluded.weekly_rate_cents,
    monthly_rate_cents = excluded.monthly_rate_cents,
    operator_daily_rate_cents = excluded.operator_daily_rate_cents,
    active = excluded.active;

-- Seed default settings.
insert into kiril_settings (key, value) values
  ('tax_rate', '0.13'::jsonb),
  ('discounts.google_review_enabled', 'true'::jsonb),
  ('discounts.google_review_pct', '0.05'::jsonb),
  ('delivery_fee_king_township_cents', '0'::jsonb),
  ('delivery_fee_gta_cents', '9999'::jsonb),
  ('deposit_pct', '0.20'::jsonb),
  ('etransfer_recipient_email', '"kingequipmentrental.ca@gmail.com"'::jsonb),
  ('calendar_ical_token', '""'::jsonb)
  on conflict (key) do nothing;

-- Set a random iCal token for the private calendar feed.
update kiril_settings
  set value = to_jsonb(encode(gen_random_bytes(24), 'hex')::text)
  where key = 'calendar_ical_token' and value::text = '""';
