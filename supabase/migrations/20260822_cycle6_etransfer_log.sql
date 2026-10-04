-- kiril cycle-6 — e-transfer inbound log

create table if not exists kiril_etransfer_log (
  id uuid primary key default gen_random_uuid(),
  verdict text not null,
  payload jsonb not null,
  created_at timestamptz default now()
);

comment on table kiril_etransfer_log is 'One row per inbound e-transfer notification email processed. verdict = matched_and_marked_paid | unmatched_or_ambiguous | unparseable | ignored_non_intake';

create index if not exists kiril_etransfer_log_verdict_idx on kiril_etransfer_log(verdict);
create index if not exists kiril_etransfer_log_created_at_idx on kiril_etransfer_log(created_at desc);

alter table kiril_etransfer_log enable row level security;
