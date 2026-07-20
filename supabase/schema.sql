-- ============================================================
-- Stix N Vibes — Supabase schema migration
-- Run in Supabase Studio → SQL Editor (or via `supabase db push`).
-- All idempotent — safe to re-run.
-- ============================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ---------- Helper: updated_at trigger ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 1. categories — hierarchical (parent_id self-reference)
-- ============================================================
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  parent_id   uuid references public.categories(id) on delete set null,
  icon        text,
  sort_order  int  not null default 0,
  is_featured boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists categories_parent_id_idx on public.categories(parent_id);
create index if not exists categories_slug_idx       on public.categories(slug);
drop trigger if exists categories_updated_at on public.categories;
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

-- ============================================================
-- 2. products
-- ============================================================
do $$ begin
  create type public.product_type as enum (
    'sticker', 'sticker_vinyl', 'poster', 'spotify_card', 'frame', 'mystery_pack'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              text not null unique,
  description       text,
  short_description text,
  price_cents       int  not null check (price_cents >= 0),
  compare_at_cents  int  check (compare_at_cents >= 0),
  currency          text not null default 'INR',
  image_url         text,
  images            jsonb not null default '[]'::jsonb,
  type              public.product_type not null,
  category_id       uuid references public.categories(id) on delete set null,
  collection        text,
  tags              text[] not null default '{}',
  stock             int  not null default 0 check (stock >= 0),
  is_featured       boolean not null default false,
  is_bundle         boolean not null default false,
  is_limited        boolean not null default false,
  bundle_ids        uuid[] not null default '{}',
  customizable      boolean not null default false,
  rating            numeric(2,1) not null default 0,
  review_count      int  not null default 0,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists products_slug_idx        on public.products(slug);
create index if not exists products_type_idx        on public.products(type);
create index if not exists products_featured_idx     on public.products(is_featured);
create index if not exists products_tags_idx        on public.products using gin (tags);
drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- ============================================================
-- 3. variants — size / color / finish options
-- ============================================================
create table if not exists public.variants (
  id                   uuid primary key default gen_random_uuid(),
  product_id           uuid not null references public.products(id) on delete cascade,
  name                 text not null,
  sku                  text unique,
  price_modifier_cents int not null default 0,
  stock                int  not null default 0 check (stock >= 0),
  attributes           jsonb not null default '{}'::jsonb,
  sort_order           int  not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists variants_product_id_idx on public.variants(product_id);
drop trigger if exists variants_updated_at on public.variants;
create trigger variants_updated_at before update on public.variants
  for each row execute function public.set_updated_at();

-- ============================================================
-- 4. customizations — saved live-preview data per product per user
-- ============================================================
create table if not exists public.customizations (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  data        jsonb not null default '{}'::jsonb,
  snapshot_url text,
  created_at  timestamptz not null default now()
);
create index if not exists customizations_product_id_idx on public.customizations(product_id);
create index if not exists customizations_user_id_idx     on public.customizations(user_id);

-- ============================================================
-- 5. orders
-- ============================================================
do $$ begin
  create type public.order_status as enum (
    'created', 'sent', 'confirmed', 'paid', 'fulfilled', 'cancelled', 'refunded'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete set null,
  razorpay_order_id text,
  whatsapp_url      text,
  customer_name     text not null,
  customer_phone    text not null,
  customer_email    text,
  address           text not null,
  pincode           text not null,
  total_cents       int  not null check (total_cents >= 0),
  status            public.order_status not null default 'created',
  notes             text,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists orders_user_id_idx    on public.orders(user_id);
create index if not exists orders_status_idx     on public.orders(status);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- ============================================================
-- 6. order_items
-- ============================================================
create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid references public.products(id) on delete set null,
  variant_id  uuid references public.variants(id) on delete set null,
  name        text not null,
  quantity    int  not null check (quantity > 0),
  price_cents int  not null check (price_cents >= 0),
  image_url   text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists order_items_order_id_idx   on public.order_items(order_id);
create index if not exists order_items_product_id_idx on public.order_items(product_id);

-- ============================================================
-- 7. reviews — powers JSON-LD aggregateRating
-- ============================================================
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  author_name text not null,
  author_avatar text,
  rating      int  not null check (rating between 1 and 5),
  comment     text,
  is_featured boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists reviews_product_id_idx on public.reviews(product_id);
create index if not exists reviews_featured_idx   on public.reviews(is_featured);

-- Trigger to keep product.rating and product.review_count denormalised
create or replace function public.recalc_product_rating()
returns trigger language plpgsql as $$
declare
  pid uuid;
begin
  pid := coalesce(new.product_id, old.product_id);
  if pid is null then return null; end if;
  update public.products p set
    rating = coalesce((select round(avg(rating)::numeric, 1) from public.reviews where product_id = pid), 0),
    review_count = coalesce((select count(*) from public.reviews where product_id = pid), 0)
  where p.id = pid;
  return coalesce(new, old);
end;
$$;
drop trigger if exists reviews_product_rating on public.reviews;
create trigger reviews_product_rating after insert or update or delete on public.reviews
  for each row execute function public.recalc_product_rating();

-- ============================================================
-- 8. referrals
-- ============================================================
create table if not exists public.referrals (
  id                uuid primary key default gen_random_uuid(),
  referrer_user_id  uuid not null references auth.users(id) on delete cascade,
  referred_user_id  uuid references auth.users(id) on delete set null,
  referral_code     text not null unique,
  referred_email    text,
  credit_cents      int not null default 10000, -- ₹100 in paise
  used              boolean not null default false,
  used_at           timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists referrals_referrer_idx on public.referrals(referrer_user_id);
create index if not exists referrals_code_idx    on public.referrals(referral_code);

-- ============================================================
-- 9. analytics — generic event log (web-vitals, page views, conversions)
-- ============================================================
create table if not exists public.analytics (
  id          uuid primary key default gen_random_uuid(),
  event       text not null,
  payload     jsonb not null default '{}'::jsonb,
  session_id  text,
  user_id     uuid references auth.users(id) on delete set null,
  url         text,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists analytics_event_idx       on public.analytics(event);
create index if not exists analytics_created_at_idx on public.analytics(created_at desc);

-- ============================================================
-- Row-Level Security
-- Public can read approved catalog & reviews.
-- Only authenticated owner (or service role) can mutate their own data.
-- ============================================================

-- Categories: public read, no public write
alter table public.categories enable row level security;
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories
  for select using (true);

-- Products: public read, write only to authenticated admins
alter table public.products enable row level security;
drop policy if exists products_read on public.products;
create policy products_read on public.products
  for select using (true);

-- Variants: public read
alter table public.variants enable row level security;
drop policy if exists variants_read on public.variants;
create policy variants_read on public.variants
  for select using (true);

-- Reviews: public read featured/all; users can manage their own
alter table public.reviews enable row level security;
drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews
  for select using (true);
drop policy if exists reviews_insert_own on public.reviews;
create policy reviews_insert_own on public.reviews
  for insert with check (auth.uid() = user_id);
drop policy if exists reviews_update_own on public.reviews;
create policy reviews_update_own on public.reviews
  for update using (auth.uid() = user_id);
drop policy if exists reviews_delete_own on public.reviews;
create policy reviews_delete_own on public.reviews
  for delete using (auth.uid() = user_id);

-- Customizations: owner only
alter table public.customizations enable row level security;
drop policy if exists customizations_select_own on public.customizations;
create policy customizations_select_own on public.customizations
  for select using (auth.uid() = user_id);
drop policy if exists customizations_insert_own on public.customizations;
create policy customizations_insert_own on public.customizations
  for insert with check (auth.uid() = user_id or user_id is null);
drop policy if exists customizations_update_own on public.customizations;
create policy customizations_update_own on public.customizations
  for update using (auth.uid() = user_id);
drop policy if exists customizations_delete_own on public.customizations;
create policy customizations_delete_own on public.customizations
  for delete using (auth.uid() = user_id);

-- Orders: owner can read their own; inserts allowed for checkout (anon or auth)
alter table public.orders enable row level security;
drop policy if exists orders_select_own on public.orders;
create policy orders_select_own on public.orders
  for select using (auth.uid() = user_id);
drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders
  for insert with check (true);
-- Updates only via service-role (admin) — no public policy for updates.

-- Order items: readable only if you own the parent order
alter table public.order_items enable row level security;
drop policy if exists order_items_select_own on public.order_items;
create policy order_items_select_own on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );
drop policy if exists order_items_insert on public.order_items;
create policy order_items_insert on public.order_items
  for insert with check (true);

-- Referrals: owner read; insert allowed
alter table public.referrals enable row level security;
drop policy if exists referrals_select_own on public.referrals;
create policy referrals_select_own on public.referrals
  for select using (auth.uid() = referrer_user_id or auth.uid() = referred_user_id);
drop policy if exists referrals_insert on public.referrals;
create policy referrals_insert on public.referrals
  for insert with check (auth.uid() = referrer_user_id);

-- Analytics: anyone can write (page views, web-vitals); no public read
alter table public.analytics enable row level security;
drop policy if exists analytics_insert on public.analytics;
create policy analytics_insert on public.analytics
  for insert with check (true);

-- ============================================================
-- Admin role: any authenticated user with email in admin_emails table
-- ============================================================
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email   text not null,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
drop policy if exists admin_users_read on public.admin_users;
create policy admin_users_read on public.admin_users
  for select using (auth.uid() = user_id);

-- Admin RLS policies: write to catalog/variants/orders only if user is in admin_users
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

-- Apply admin-only writes for product catalog
drop policy if exists products_write_admin on public.products;
create policy products_write_admin on public.products
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists categories_write_admin on public.categories;
create policy categories_write_admin on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists variants_write_admin on public.variants;
create policy variants_write_admin on public.variants
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists orders_update_admin on public.orders;
create policy orders_update_admin on public.orders
  for update using (public.is_admin());

drop policy if exists order_items_update_admin on public.order_items;
create policy order_items_update_admin on public.order_items
  for update using (public.is_admin());

-- ============================================================
-- Storage bucket for uploaded images (customizer)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('stixnvibes', 'stixnvibes', true)
on conflict (id) do nothing;

drop policy if exists "Public read for stixnvibes bucket" on storage.objects;
create policy "Public read for stixnvibes bucket" on storage.objects
  for select using (bucket_id = 'stixnvibes');

drop policy if exists "Auth users can upload to stixnvibes bucket" on storage.objects;
create policy "Auth users can upload to stixnvibes bucket" on storage.objects
  for insert with check (bucket_id = 'stixnvibes' and auth.role() = 'authenticated');

-- Done. ✅
