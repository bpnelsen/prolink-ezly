-- migrations/023_website_builder_v2.sql
--
-- Website Builder v2 — full setup + upgrade.
--
-- Includes:
--   0. Base `contractor_websites` table (idempotent — only created if it
--      doesn't already exist; on databases that already had it, this is
--      a no-op and the column additions below still apply).
--   1. New optional columns on contractor_websites for logo, gallery,
--      fonts, SEO meta, social links, and business hours.
--   2. New `website_leads` table — lead capture from the public site's
--      contact form. Anonymous visitors can INSERT (RLS), contractors
--      can read/update only their own rows.
--   3. Public storage bucket `website-assets` for logos and gallery
--      photos, scoped to /{contractor_id}/...
--
-- Idempotent — safe to run multiple times.

begin;

-- ---------------------------------------------------------------------------
-- 0. Base table (create if missing)
-- ---------------------------------------------------------------------------
create table if not exists public.contractor_websites (
  id                uuid primary key default gen_random_uuid(),
  contractor_id     uuid not null references auth.users(id) on delete cascade,

  -- Business basics (mirror the Questionnaire shape used by the builder UI)
  business_name     text,
  owner_name        text,
  tagline           text,
  about_story       text,
  services          jsonb not null default '[]'::jsonb,
  service_areas     text,
  phone             text,
  email             text,
  years_experience  text,
  licensed          boolean not null default false,
  insured           boolean not null default false,

  -- Layout + theming
  sections          jsonb not null default '["hero","services","about","contact"]'::jsonb,
  theme             text not null default 'navy',
  slug              text not null,
  custom_domain     text,

  -- AI-generated body
  content           jsonb not null default '{}'::jsonb,
  published         boolean not null default false,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  unique (contractor_id),
  unique (slug)
);

create index if not exists contractor_websites_slug_idx       on public.contractor_websites(slug);
create index if not exists contractor_websites_contractor_idx on public.contractor_websites(contractor_id);

-- Owner-scoped RLS + public read for published rows.
alter table public.contractor_websites enable row level security;

drop policy if exists "Contractors manage own website" on public.contractor_websites;
create policy "Contractors manage own website"
  on public.contractor_websites
  for all
  using (auth.uid() = contractor_id)
  with check (auth.uid() = contractor_id);

drop policy if exists "Public can view published sites" on public.contractor_websites;
create policy "Public can view published sites"
  on public.contractor_websites
  for select
  using (published = true);

-- ---------------------------------------------------------------------------
-- 1. New v2 columns on contractor_websites
-- ---------------------------------------------------------------------------
alter table public.contractor_websites
  add column if not exists logo_url          text,
  add column if not exists gallery_images    jsonb       not null default '[]'::jsonb,
  add column if not exists font_family       text        not null default 'inter',
  add column if not exists seo_title         text,
  add column if not exists seo_description   text,
  add column if not exists social_image_url  text,
  add column if not exists social_facebook   text,
  add column if not exists social_instagram  text,
  add column if not exists social_x          text,
  add column if not exists social_linkedin   text,
  add column if not exists social_google     text,
  add column if not exists business_hours    jsonb       not null default '{}'::jsonb,
  add column if not exists lead_notify_email text;

-- ---------------------------------------------------------------------------
-- 2. website_leads
-- ---------------------------------------------------------------------------
create table if not exists public.website_leads (
  id                   uuid primary key default gen_random_uuid(),
  contractor_id        uuid not null references auth.users(id) on delete cascade,
  website_id           uuid references public.contractor_websites(id) on delete set null,
  slug                 text not null,

  name                 text not null,
  email                text,
  phone                text,
  message              text,
  service_interest     text,
  preferred_contact    text check (preferred_contact is null or preferred_contact in ('email', 'phone', 'text')),
  preferred_time       text,
  budget_range         text,
  project_address      text,
  project_city         text,
  project_zip          text,

  source               text not null default 'website',
  status               text not null default 'new'
                        check (status in ('new','contacted','quoted','won','lost','spam')),
  notes                text,
  ip_address           text,
  user_agent           text,
  referrer             text,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists website_leads_contractor_idx on public.website_leads(contractor_id, created_at desc);
create index if not exists website_leads_status_idx     on public.website_leads(contractor_id, status);

-- updated_at trigger
create or replace function public.touch_website_leads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_website_leads_touch on public.website_leads;
create trigger trg_website_leads_touch
  before update on public.website_leads
  for each row execute function public.touch_website_leads_updated_at();

-- RLS
alter table public.website_leads enable row level security;

drop policy if exists "Contractors read own leads" on public.website_leads;
create policy "Contractors read own leads"
  on public.website_leads
  for select
  using (auth.uid() = contractor_id);

drop policy if exists "Contractors update own leads" on public.website_leads;
create policy "Contractors update own leads"
  on public.website_leads
  for update
  using (auth.uid() = contractor_id)
  with check (auth.uid() = contractor_id);

drop policy if exists "Contractors delete own leads" on public.website_leads;
create policy "Contractors delete own leads"
  on public.website_leads
  for delete
  using (auth.uid() = contractor_id);

-- Anonymous visitors can submit a lead, but only to a slug that maps to a
-- published site, and the contractor_id MUST match that site's owner — so
-- the client can't impersonate another tenant.
drop policy if exists "Anon submit lead to published site" on public.website_leads;
create policy "Anon submit lead to published site"
  on public.website_leads
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.contractor_websites w
      where w.slug          = website_leads.slug
        and w.contractor_id = website_leads.contractor_id
        and w.published     = true
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Storage bucket for logos + gallery photos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('website-assets', 'website-assets', true)
  on conflict (id) do update set public = excluded.public;

-- Owner-scoped writes: object name must start with `{auth.uid()}/`
drop policy if exists "Contractors upload own website assets" on storage.objects;
create policy "Contractors upload own website assets"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'website-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Contractors update own website assets" on storage.objects;
create policy "Contractors update own website assets"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'website-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Contractors delete own website assets" on storage.objects;
create policy "Contractors delete own website assets"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'website-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Public read website assets" on storage.objects;
create policy "Public read website assets"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'website-assets');

commit;
