-- King Equipment cycle 9: let admins override the equipment NAME.
-- Previously overrides covered pricing/specs/photos/availability/visible/city_delivery.
-- Kiril also needs to rename items without redeploy.
-- Idempotent: safe to re-run.

alter table equipment_overrides add column if not exists name text;
alter table equipment_overrides add column if not exists short_name text;
alter table equipment_overrides add column if not exists tagline text;
