-- King Equipment cycle 10: long-form editorial fields.
-- Adds free-form description + bullet-list fields (specs/attachments/ideal)
-- to equipment_overrides and equipment_custom. All optional; empty => hidden.
-- attachments_included + ideal_for already exist on equipment_custom (cycle 9).
-- Idempotent: safe to re-run.

alter table equipment_overrides
  add column if not exists description text,
  add column if not exists specs_bullets jsonb,
  add column if not exists attachments_included jsonb,
  add column if not exists ideal_for jsonb;

alter table equipment_custom
  add column if not exists description text,
  add column if not exists specs_bullets jsonb;
