-- Supabase migration script for Stix N Vibes
-- Run with: supabase db push (or psql < migrations.sql)

-- Enable extensions if needed
create extension if not exists pgcrypto;

-- 1. categories
create table if not exists categories (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  parent_id     uuid references categories(id) on delete cascade,
  created_at    timestamp with time zone default now()
);

-- 2. products
create table if not exists products (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              text not null unique,
  description       text,
  short_description text,
  price_cents       integer not null,
  image_url         text,
  type              text check (type in ('sticker','vinyl','poster','spotify','frame','mystery')),
  stock             integer default 0,
  is_featured       boolean default false,
  is_bundle         boolean default false,
  bundle_ids        uuid[] default '{}',
  created_at        timestamp with time zone default now(),
  updated_at        timestamp with time zone default now()
);

-- 3. variants
create table if not exists variants (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid references products(id) on delete cascade,
  name              text not null,
  price_modifier_cents integer default 0,
  stock             integer default 0,
  created_at        timestamp with time zone default now()
);

-- 4. customizations
create table if not exists customizations (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid references products(id) on delete cascade,
  user_id      uuid,
  data         jsonb,
  created_at   timestamp with time zone default now()
);

-- 5. orders
create table if not exists orders (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid,
  whatsapp_url       text,
  total_cents        integer not null,
  status             text check (status in ('created','sent','paid','cancelled')) default 'created',
  created_at          timestamp with time zone default now()
);

-- 6. order_items
create table if not exists order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid references orders(id) on delete cascade,
  product_id  uuid references products(id),
  variant_id  uuid references variants(id),
  quantity    integer not null default 1,
  price_cents integer not null,
  created_at  timestamp with time zone default now()
);

-- 7. reviews
create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid references products(id) on delete cascade,
  user_id     uuid,
  rating      integer check (rating between 1 and 5),
  comment     text,
  created_at  timestamp with time zone default now()
);

-- 8. referrals
create table if not exists referrals (
  id                uuid primary key default gen_random_uuid(),
  referrer_user_id  uuid,
  referred_user_id  uuid,
  used              boolean default false,
  created_at        timestamp with time zone default now()
);

-- 9. analytics
create table if not exists analytics (
  id        uuid primary key default gen_random_uuid(),
  event     text not null,
  payload   jsonb,
  created_at timestamp with time zone default now()
);
