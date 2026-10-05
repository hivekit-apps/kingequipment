-- King Equipment cycle 7: multi-item orders replacing single-item bookings.
-- Legacy kiril_bookings/kiril_equipment are preserved; new orders/order_items
-- are the forward path for the multi-SKU ecommerce rebuild.

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  status text not null default 'pending',
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  delivery_address text not null,
  delivery_city text not null,
  delivery_price_cents int,
  deposit_total_cents int,
  rental_subtotal_cents int,
  buy_subtotal_cents int,
  grand_total_cents int,
  stripe_payment_intent text,
  notes text
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  equipment_id text not null,
  equipment_name text not null,
  kind text not null,
  qty int not null default 1,
  start_date date,
  end_date date,
  days int,
  applied_tier text,
  unit_subtotal_cents int,
  deposit_cents int
);

create index if not exists idx_orders_created_at on orders(created_at desc);
create index if not exists idx_order_items_order_id on order_items(order_id);

-- Admin overrides for catalog data (Option A per plan): we keep config/site.json
-- as the seed, but allow admin edits via Supabase without redeploy. The read-time
-- merge is handled in server-side code (future).
create table if not exists equipment_overrides (
  equipment_id text primary key,
  updated_at timestamptz default now(),
  pricing jsonb,
  specs jsonb,
  photos jsonb,
  availability jsonb,
  visible boolean,
  city_delivery jsonb -- { city_slug: cents, ... } per-city overrides
);

-- Blocked-date registry for per-SKU availability (extends per-equipment
-- availability). Keep separate from the kiril_availability table for forward
-- compatibility.
create table if not exists equipment_blocked_dates (
  id uuid primary key default gen_random_uuid(),
  equipment_id text not null,
  blocked_date date not null,
  reason text,
  created_at timestamptz default now(),
  unique(equipment_id, blocked_date)
);
create index if not exists idx_equipment_blocked_dates_sku on equipment_blocked_dates(equipment_id);

alter table orders enable row level security;
alter table order_items enable row level security;
alter table equipment_overrides enable row level security;
alter table equipment_blocked_dates enable row level security;
