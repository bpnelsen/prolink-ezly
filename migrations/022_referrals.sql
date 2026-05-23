-- supabase/migrations/20260522_referrals.sql
--
-- Referral program schema.
-- Reward model: when a referred user makes their first paid charge,
-- the referrer's trial is extended by REFERRAL_TRIAL_EXTENSION_DAYS
-- (default 14, configurable via env on the API side).

begin;

-- Referral codes — one canonical code per user. Generated on demand.
create table if not exists referral_codes (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  code        text not null unique,
  created_at  timestamptz not null default now()
);

create index if not exists referral_codes_code_idx on referral_codes(code);

-- Referrals — one row per attributed signup.
-- referred_user_id is unique because a user can only be attributed to one referrer.
create table if not exists referrals (
  id                  uuid primary key default gen_random_uuid(),
  referrer_user_id    uuid not null references auth.users(id) on delete cascade,
  referred_user_id    uuid not null unique references auth.users(id) on delete cascade,
  referral_code       text not null references referral_codes(code),
  status              text not null check (status in ('signed_up', 'converted', 'reward_applied', 'invalid')),
  signed_up_at        timestamptz not null default now(),
  converted_at        timestamptz,
  reward_applied_at   timestamptz,
  reward_metadata     jsonb,  -- e.g. { "trial_extended_until": "...", "days_added": 14 }
  constraint referrer_not_self check (referrer_user_id <> referred_user_id)
);

create index if not exists referrals_referrer_idx on referrals(referrer_user_id);
create index if not exists referrals_status_idx on referrals(status);

-- Optional: a view for the "my referrals" UI.
create or replace view referral_summary as
select
  rc.user_id as referrer_user_id,
  rc.code,
  count(r.id) filter (where r.status = 'signed_up')      as pending_count,
  count(r.id) filter (where r.status = 'converted')      as converted_count,
  count(r.id) filter (where r.status = 'reward_applied') as rewarded_count
from referral_codes rc
left join referrals r on r.referrer_user_id = rc.user_id
group by rc.user_id, rc.code;

-- RLS — users see only their own referrals and code.
alter table referral_codes enable row level security;
alter table referrals      enable row level security;

create policy referral_codes_self_select
  on referral_codes for select
  using (user_id = auth.uid());

create policy referral_codes_self_insert
  on referral_codes for insert
  with check (user_id = auth.uid());

create policy referrals_referrer_select
  on referrals for select
  using (referrer_user_id = auth.uid() or referred_user_id = auth.uid());

-- Inserts and updates to referrals go through the API service role only.
-- (Don't grant insert/update to authenticated; this prevents client tampering.)

commit;
