-- Stix N Vibes shop schema (v3: WhatsApp ordering).
--
-- Access model: Row Level Security is ON for every table and there are NO
-- policies, so the public anon key can read or write nothing. The Next.js
-- server talks to Supabase with the service role key, which bypasses RLS.
-- Admin access is checked in the app (ADMIN_EMAILS allowlist).

create extension if not exists pgcrypto;

-- Catalog ----------------------------------------------------------------

create table if not exists public.collections (
  id          text primary key default gen_random_uuid()::text,
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (char_length(name) between 1 and 80),
  description text not null default '',
  image       text not null default '',
  active      boolean not null default true,
  featured    boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.products (
  id               text primary key default gen_random_uuid()::text,
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name             text not null check (char_length(name) between 1 and 120),
  type             text not null check (type in ('sticker', 'sheet', 'poster', 'music-card', 'wall-card')),
  collection_ids   text[] not null default '{}',
  description      text not null default '',
  details          text not null default '',
  images           text[] not null default '{}',
  tags             text[] not null default '{}',
  status           text not null default 'live' check (status in ('live', 'upcoming', 'hidden')),
  featured         boolean not null default false,
  sold_out         boolean not null default false,
  badge            text not null default '',
  sort_order       integer not null default 0,
  price_paise      integer check (price_paise is null or price_paise >= 0),
  compare_at_paise integer check (compare_at_paise is null or compare_at_paise >= 0),
  -- [{id, name, values: [{id, label, priceDeltaPaise}]}]
  options          jsonb not null default '[]',
  -- [{id, label, kind, required, help}]
  custom_fields    jsonb not null default '[]',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists products_status_idx on public.products(status, sort_order);
create index if not exists products_collections_idx on public.products using gin (collection_ids);

-- Buy X get Y free, per product type (null = every type).
create table if not exists public.offers (
  id           text primary key default gen_random_uuid()::text,
  name         text not null check (char_length(name) between 1 and 80),
  description  text not null default '',
  product_type text check (product_type is null or product_type in ('sticker', 'sheet', 'poster', 'music-card', 'wall-card')),
  buy          integer not null check (buy between 1 and 100),
  free         integer not null check (free between 1 and 100),
  active       boolean not null default true,
  sort_order   integer not null default 0
);

-- Orders sent to WhatsApp ---------------------------------------------------
-- Lines are snapshots taken when the customer tapped "Order on WhatsApp",
-- so editing or deleting a product never changes a past order.

create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  number         text not null unique check (number ~ '^SNV-[A-Z0-9]{6}$'),
  status         text not null default 'new' check (status in ('new', 'confirmed', 'paid', 'shipped', 'done', 'cancelled')),
  customer_name  text not null default '',
  customer_note  text not null default '',
  lines          jsonb not null,
  subtotal_paise integer not null check (subtotal_paise >= 0),
  discount_paise integer not null default 0 check (discount_paise >= 0),
  total_paise    integer not null check (total_paise >= 0),
  offers         jsonb not null default '[]',
  admin_note     text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists orders_created_idx on public.orders(created_at desc);
create index if not exists orders_status_idx on public.orders(status, created_at desc);

-- Customer photos for custom products (music cards). Files live in the
-- private customer-uploads bucket; admin opens them via short signed links.
create table if not exists public.uploads (
  id           text primary key check (id ~ '^[a-z0-9]{20,40}$'),
  path         text not null,
  content_type text not null,
  size         integer not null,
  created_at   timestamptz not null default now()
);

-- Anonymous storefront analytics: no cookies, no personal data.
create table if not exists public.events (
  id         bigint generated always as identity primary key,
  type       text not null check (type in ('view', 'add_to_cart', 'order_click', 'ask_click')),
  product_id text,
  path       text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists events_created_idx on public.events(created_at desc);

create table if not exists public.settings (
  id   integer primary key default 1 check (id = 1),
  data jsonb not null default '{}'
);

alter table public.collections enable row level security;
alter table public.products    enable row level security;
alter table public.offers      enable row level security;
alter table public.orders      enable row level security;
alter table public.uploads     enable row level security;
alter table public.events      enable row level security;
alter table public.settings    enable row level security;

-- Functions --------------------------------------------------------------

create or replace function public.delete_collection(p_id text)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.products set collection_ids = array_remove(collection_ids, p_id) where p_id = any(collection_ids);
  delete from public.collections where id = p_id;
$$;

-- Dashboard numbers since a point in time, in the shape of the app's Stats type.
create or replace function public.shop_stats(p_since timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with ev as (
    select * from public.events where created_at >= p_since
  ), ord as (
    select * from public.orders where created_at >= p_since and status <> 'cancelled'
  ), days as (
    select d::date as day,
           (select count(*) from ev where type = 'view' and created_at::date = d::date) as views,
           (select count(*) from ord where created_at::date = d::date) as orders
      from generate_series(p_since::date, now()::date, interval '1 day') d
  )
  select jsonb_build_object(
    'views',          (select count(*) from ev where type = 'view'),
    'addToCart',      (select count(*) from ev where type = 'add_to_cart'),
    'orderClicks',    (select count(*) from ev where type = 'order_click'),
    'askClicks',      (select count(*) from ev where type = 'ask_click'),
    'orders',         (select count(*) from ord),
    'orderValuePaise',(select coalesce(sum(total_paise), 0) from ord),
    'topViewed', coalesce((
      select jsonb_agg(jsonb_build_object('productId', product_id, 'count', c) order by c desc)
        from (select product_id, count(*) c from ev where type = 'view' and product_id is not null
               group by product_id order by c desc limit 8) t), '[]'::jsonb),
    'topOrdered', coalesce((
      select jsonb_agg(jsonb_build_object('productId', pid, 'qty', q) order by q desc)
        from (select l->>'productId' pid, sum((l->>'qty')::int) q
                from ord, jsonb_array_elements(ord.lines) l
               group by 1 order by 2 desc limit 8) t), '[]'::jsonb),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', to_char(day, 'YYYY-MM-DD'), 'views', views, 'orders', orders) order by day)
        from days where views > 0 or orders > 0), '[]'::jsonb)
  );
$$;

revoke all on function public.delete_collection(text) from public, anon, authenticated;
revoke all on function public.shop_stats(timestamptz) from public, anon, authenticated;
grant execute on function public.delete_collection(text) to service_role;
grant execute on function public.shop_stats(timestamptz) to service_role;

-- Storage ---------------------------------------------------------------
-- product-images is public (product photos). customer-uploads is private.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, array['image/png', 'image/jpeg', 'image/webp']),
  ('customer-uploads', 'customer-uploads', false, 8388608, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
