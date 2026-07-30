-- Job-Finder-App initial schema (ported from the previous Mongoose models).
-- Auth remains the app's own JWT; the app connects via the privileged Postgres
-- role (table owner) which bypasses RLS. RLS is enabled with no policies so the
-- anon/authenticated PostgREST keys cannot read/write these tables.

-- updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
create table public.users (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  username   text not null,
  password   text not null,
  role       text not null default 'user'   check (role in ('admin', 'user')),
  status     text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_username_key unique (username),
  constraint users_email_role_key unique (email, role)
);
create trigger users_set_updated_at before update on public.users
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- user_profiles  (one per user)
-- ---------------------------------------------------------------------------
create table public.user_profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  skills              text[] not null default '{}',
  job_titles          text[] not null default '{}',
  resume_summary      text,
  years_of_experience numeric,
  updated_at          timestamptz not null default now(),
  constraint user_profiles_user_id_key unique (user_id)
);
create trigger user_profiles_set_updated_at before update on public.user_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- listings  (Adzuna cache + manual listings)
-- ---------------------------------------------------------------------------
create table public.listings (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  company     text not null,
  location    text,
  description text,
  source      text not null default 'adzuna',
  source_url  text,
  source_id   text not null,
  country     text not null default 'sg',
  expires_at  timestamptz not null,
  posted_at   timestamptz,
  salary_min  double precision,
  salary_max  double precision,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint listings_source_id_country_key unique (source_id, country)
);
create index listings_expires_at_idx on public.listings (expires_at);
create index listings_created_at_idx on public.listings (created_at desc);
create trigger listings_set_updated_at before update on public.listings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- saved_listings  (snapshot; no FK to listings since listings expire)
-- ---------------------------------------------------------------------------
create table public.saved_listings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  listing_id uuid not null,
  title      text not null,
  company    text not null,
  location   text,
  source_url text,
  country    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_listings_user_listing_key unique (user_id, listing_id)
);
create index saved_listings_user_id_idx on public.saved_listings (user_id, created_at desc);
create trigger saved_listings_set_updated_at before update on public.saved_listings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- listing_views  (trending signal; no FK to listings since listings expire)
-- ---------------------------------------------------------------------------
create table public.listing_views (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null,
  viewed_at  timestamptz not null default now()
);
create index listing_views_listing_viewed_idx on public.listing_views (listing_id, viewed_at desc);
create index listing_views_viewed_at_idx on public.listing_views (viewed_at desc);

-- ---------------------------------------------------------------------------
-- ai_summaries
-- ---------------------------------------------------------------------------
create table public.ai_summaries (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.users(id) on delete cascade,
  input_text_hash      text not null,
  tldr                 text not null,
  key_responsibilities text[],
  requirements         text[],
  nice_to_haves        text[],
  salary_sgd           text,
  jd_match             jsonb,
  caveats              text[],
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index ai_summaries_hash_user_idx on public.ai_summaries (input_text_hash, user_id);
create index ai_summaries_user_id_idx on public.ai_summaries (user_id);
create trigger ai_summaries_set_updated_at before update on public.ai_summaries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- comparison_summaries
-- ---------------------------------------------------------------------------
create table public.comparison_summaries (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.users(id) on delete cascade,
  listing_ids_key       text not null,
  summary               text not null,
  similarities          text[],
  differences           text[],
  comparison_points     text[],
  recommended_listing_id text,
  recommendation_reason text,
  listing_match_scores  jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index comparison_summaries_user_key_idx on public.comparison_summaries (user_id, listing_ids_key);
create trigger comparison_summaries_set_updated_at before update on public.comparison_summaries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- search_cache  (Adzuna search dedup by query hash)
-- ---------------------------------------------------------------------------
create table public.search_cache (
  id          uuid primary key default gen_random_uuid(),
  cache_key   text not null,
  listing_ids uuid[] not null default '{}',
  total_count integer not null default 0,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint search_cache_cache_key_key unique (cache_key)
);
create index search_cache_expires_at_idx on public.search_cache (expires_at);
create trigger search_cache_set_updated_at before update on public.search_cache
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Enable RLS (no policies) on all app tables. The server uses the privileged
-- Postgres role (table owner) which bypasses RLS; the PostgREST anon/auth keys
-- get no access.
-- ---------------------------------------------------------------------------
alter table public.users                enable row level security;
alter table public.user_profiles        enable row level security;
alter table public.listings             enable row level security;
alter table public.saved_listings       enable row level security;
alter table public.listing_views        enable row level security;
alter table public.ai_summaries         enable row level security;
alter table public.comparison_summaries enable row level security;
alter table public.search_cache         enable row level security;
