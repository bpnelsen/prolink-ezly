-- Cookie consent audit log.
-- Stores one row per consent decision (initial accept/reject, GPC auto-opt-out, or preference change).

create extension if not exists "pgcrypto";

create table if not exists consent_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  anonymous_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  regime text not null check (regime in ('gdpr', 'ccpa', 'default')),
  jurisdiction_country text,
  jurisdiction_region text,
  consent jsonb not null,
  gpc_signal boolean not null default false,
  policy_version text not null,
  ui_version text not null,
  user_agent text,
  ip_hash text
);

create index if not exists consent_logs_anonymous_id_idx on consent_logs (anonymous_id);
create index if not exists consent_logs_created_at_idx on consent_logs (created_at);
create index if not exists consent_logs_user_id_idx on consent_logs (user_id);

alter table consent_logs enable row level security;

-- Anonymous visitors can append their consent decision but cannot read.
drop policy if exists consent_logs_insert_anon on consent_logs;
create policy consent_logs_insert_anon on consent_logs
  for insert
  to anon, authenticated
  with check (true);

-- Reads are reserved for the service role (server-side audit queries only).
drop policy if exists consent_logs_no_select on consent_logs;
create policy consent_logs_no_select on consent_logs
  for select
  to anon, authenticated
  using (false);
