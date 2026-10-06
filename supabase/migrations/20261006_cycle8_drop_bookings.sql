-- King Equipment cycle 8: drop legacy single-SKU booking tables.
-- The multi-item orders table (orders + order_items) is now the forward path.
-- All code tied to kiril_bookings / kiril_availability / kiril_invoices /
-- kiril_etransfer_log / kiril_equipment has been removed in src/.
--
-- KEEP: kiril_admins, kiril_settings (used by auth + new order flow),
--       orders, order_items, equipment_overrides, equipment_blocked_dates.
--
-- Also deletes the delivery_fee_* rows from kiril_settings — those were
-- single-zone constants replaced by per-city pricing in config/site.json.
-- Idempotent: safe to re-run.

-- Drop RLS policies first (if any exist referencing these tables).
do $$ begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'kiril_bookings') then
    execute 'drop policy if exists kiril_bookings_self_read on kiril_bookings';
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'kiril_invoices') then
    execute 'drop policy if exists kiril_invoices_self_read on kiril_invoices';
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'kiril_availability') then
    execute 'drop policy if exists kiril_availability_self_read on kiril_availability';
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'kiril_etransfer_log') then
    execute 'drop policy if exists kiril_etransfer_log_self_read on kiril_etransfer_log';
  end if;
end $$;

-- Drop indexes.
drop index if exists kiril_bookings_status_idx;
drop index if exists kiril_bookings_dates_idx;
drop index if exists kiril_availability_date_idx;
drop index if exists kiril_invoices_status_idx;
drop index if exists kiril_invoices_booking_idx;
drop index if exists kiril_etransfer_log_verdict_idx;
drop index if exists kiril_etransfer_log_created_at_idx;

-- Drop tables (cascade handles FK references).
drop table if exists kiril_invoices cascade;
drop table if exists kiril_availability cascade;
drop table if exists kiril_etransfer_log cascade;
drop table if exists kiril_bookings cascade;
drop table if exists kiril_equipment cascade;

-- Remove the legacy delivery fee settings (replaced by per-city pricing in
-- config/site.json). Deposit_pct, tax_rate, discounts, etransfer_recipient,
-- calendar_ical_token all stay.
delete from kiril_settings where key in (
  'delivery_fee_king_township_cents',
  'delivery_fee_gta_cents'
);
