-- King Equipment cycle 10: equipment deletion with 301 redirect.
-- When an item is deleted, we record a redirect row so old URLs
-- (/equipment/<id>, /equipment/<id>/<city>) 307 to the catalog's category hash.
-- Idempotent: safe to re-run.

create table if not exists equipment_redirects (
  equipment_id text primary key,
  redirect_to text not null,
  category_slug text,
  deleted_at timestamptz default now()
);

alter table equipment_redirects enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'equipment_redirects' and policyname = 'equipment_redirects public read'
  ) then
    create policy "equipment_redirects public read" on equipment_redirects for select using (true);
  end if;
end $$;
