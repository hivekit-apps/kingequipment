-- King Equipment cycle 9: let admins CREATE new equipment beyond site.json seed.
-- site.json remains the seed; equipment_custom is the admin-created tier.
-- Merged with site.json at read-time in getSiteConfigDynamic (custom wins on id collision).
-- Idempotent: safe to re-run.

create table if not exists equipment_custom (
  id text primary key,            -- user-supplied slug (kebab-case)
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  class text,                     -- free-text class tag ("drying", "power", ...)
  category text not null,         -- category slug (must match a site.json categories[].slug)
  name text not null,
  short_name text,
  tagline text,
  display_rate text,
  pricing jsonb,                  -- {daily,weekly,monthly,buyNew,buyUsed,deposit}
  specs jsonb,
  attachments_included jsonb,     -- string[]
  ideal_for jsonb,                -- string[]
  photos jsonb,                   -- [{src,alt}]
  availability jsonb,             -- ["rent"|"buy"]
  visible boolean default true,
  bookable boolean default true,
  operator_note text,
  photo_note text
);

alter table equipment_custom enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'equipment_custom' and policyname = 'equipment_custom public read'
  ) then
    create policy "equipment_custom public read" on equipment_custom for select using (true);
  end if;
end $$;
