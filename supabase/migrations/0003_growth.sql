-- v5: coupon codes, where customers came from, Instagram usernames,
-- custom design requests and stock counts. Additive only: every new column
-- has a default, so the v4 code keeps working while this runs.

-- Coupons ----------------------------------------------------------------
-- A code customers type at checkout (or get from a stall QR). Either a %
-- off or a flat amount off what's left after the shop's own offers.
create table if not exists public.coupons (
  code             text primary key check (code ~ '^[A-Z0-9-]{3,20}$'),
  description      text not null default '',
  percent          integer check (percent is null or percent between 1 and 90),
  amount_paise     integer check (amount_paise is null or amount_paise > 0),
  min_order_paise  integer not null default 0 check (min_order_paise >= 0),
  -- null = unlimited. Counts orders that weren't cancelled.
  max_uses         integer check (max_uses is null or max_uses > 0),
  starts_at        timestamptz,
  ends_at          timestamptz,
  -- Where the code is handed out, e.g. "WordsUp stall, Xavier's".
  source           text not null default '',
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  check ((percent is null) <> (amount_paise is null))
);
alter table public.coupons enable row level security;

-- Orders -------------------------------------------------------------------
alter table public.orders add column if not exists coupon_code text not null default '';
-- First-touch source, e.g. "stall-wordsup" or "instagram" (from ?src= / utm_source).
alter table public.orders add column if not exists source text not null default '';
-- Customer's Instagram username, optional.
alter table public.orders add column if not exists instagram text not null default '';
-- Stock already taken for this order, so confirming twice never counts twice.
alter table public.orders add column if not exists stock_taken boolean not null default false;
create index if not exists orders_coupon_idx on public.orders(coupon_code) where coupon_code <> '';

-- Events: one "visit" per browser session with its source, plus checkout opens.
alter table public.events add column if not exists source text not null default '';
do $$ begin
  alter table public.events add constraint events_type_v5_check
    check (type in ('view', 'add_to_cart', 'order_click', 'ask_click', 'visit', 'checkout'));
exception when duplicate_object then null; end $$;
alter table public.events drop constraint if exists events_type_check;

-- Stock ------------------------------------------------------------------
-- null = not counted (made to order). 0 = sold out.
alter table public.products add column if not exists stock integer check (stock is null or stock >= 0);
alter table public.products add column if not exists low_stock_at integer not null default 5 check (low_stock_at >= 0);

-- Takes or returns stock for every line of an order in one statement.
-- p_sign = -1 takes, +1 returns. Never goes below 0.
create or replace function public.adjust_stock(p_lines jsonb, p_sign integer)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.products p
     set stock = greatest(0, p.stock + p_sign * l.qty),
         updated_at = now()
    from (select x->>'productId' as pid, sum((x->>'qty')::int) as qty
            from jsonb_array_elements(p_lines) x group by 1) l
   where p.id = l.pid and p.stock is not null;
$$;
revoke all on function public.adjust_stock(jsonb, integer) from public, anon, authenticated;
grant execute on function public.adjust_stock(jsonb, integer) to service_role;

-- Custom design requests -------------------------------------------------
create table if not exists public.custom_requests (
  id             uuid primary key default gen_random_uuid(),
  number         text not null unique check (number ~ '^CUS-[A-Z0-9]{6}$'),
  status         text not null default 'new' check (status in ('new', 'quoted', 'won', 'lost')),
  customer_name  text not null,
  customer_phone text not null,
  instagram      text not null default '',
  -- Product type or "other".
  kind           text not null,
  size           text not null default '',
  qty            integer not null check (qty between 1 and 10000),
  note           text not null default '',
  -- Upload ids in the private customer-uploads bucket.
  files          text[] not null default '{}',
  source         text not null default '',
  admin_note     text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists custom_requests_created_idx on public.custom_requests(created_at desc);
alter table public.custom_requests enable row level security;

-- Analytics --------------------------------------------------------------
-- Superset of v4's shop_stats: adds the funnel, sources, coupons and
-- revenue by product type. "Sales" = orders confirmed or further along.
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
  ), sold as (
    select * from ord where status in ('confirmed', 'paid', 'shipped', 'done')
  ), days as (
    select d::date as day,
           (select count(*) from ev where type = 'view' and created_at::date = d::date) as views,
           (select count(*) from ev where type = 'visit' and created_at::date = d::date) as visits,
           (select count(*) from ord where created_at::date = d::date) as orders,
           (select coalesce(sum(total_paise), 0) from sold where created_at::date = d::date) as sales
      from generate_series(p_since::date, now()::date, interval '1 day') d
  ), sources as (
    select coalesce(nullif(source, ''), 'direct') as source, 'visit' as kind, 1 as n, 0 as paise from ev where type = 'visit'
    union all
    select coalesce(nullif(source, ''), 'direct'), 'order', 1, 0 from ord
    union all
    select coalesce(nullif(source, ''), 'direct'), 'sale', 1, total_paise from sold
  )
  select jsonb_build_object(
    'visits',          (select count(*) from ev where type = 'visit'),
    'views',           (select count(*) from ev where type = 'view'),
    'addToCart',       (select count(*) from ev where type = 'add_to_cart'),
    'checkouts',       (select count(*) from ev where type = 'checkout'),
    'orderClicks',     (select count(*) from ev where type = 'order_click'),
    'askClicks',       (select count(*) from ev where type = 'ask_click'),
    'orders',          (select count(*) from ord),
    'orderValuePaise', (select coalesce(sum(total_paise), 0) from ord),
    'sales',           (select count(*) from sold),
    'salesPaise',      (select coalesce(sum(total_paise), 0) from sold),
    'paid',            (select count(*) from ord where status in ('paid', 'shipped', 'done')),
    'topViewed', coalesce((
      select jsonb_agg(jsonb_build_object('productId', product_id, 'count', c) order by c desc)
        from (select product_id, count(*) c from ev where type = 'view' and product_id is not null
               group by product_id order by c desc limit 8) t), '[]'::jsonb),
    'topOrdered', coalesce((
      select jsonb_agg(jsonb_build_object('productId', pid, 'qty', q) order by q desc)
        from (select l->>'productId' pid, sum((l->>'qty')::int) q
                from ord, jsonb_array_elements(ord.lines) l
               group by 1 order by 2 desc limit 8) t), '[]'::jsonb),
    'byType', coalesce((
      select jsonb_agg(jsonb_build_object('type', t, 'qty', q, 'paise', p) order by p desc)
        from (select l->>'type' t, sum((l->>'qty')::int) q, sum((l->>'lineTotalPaise')::int) p
                from sold, jsonb_array_elements(sold.lines) l group by 1) x), '[]'::jsonb),
    'bySource', coalesce((
      select jsonb_agg(jsonb_build_object('source', source, 'visits', v, 'orders', o, 'sales', s, 'salesPaise', p) order by p desc, v desc)
        from (select source,
                     sum(n) filter (where kind = 'visit') v,
                     sum(n) filter (where kind = 'order') o,
                     sum(n) filter (where kind = 'sale') s,
                     sum(paise) filter (where kind = 'sale') p
                from sources group by source) x), '[]'::jsonb),
    'byCoupon', coalesce((
      select jsonb_agg(jsonb_build_object('code', coupon_code, 'orders', o, 'sales', s, 'salesPaise', p, 'discountPaise', d) order by o desc)
        from (select coupon_code,
                     count(*) o,
                     count(*) filter (where status in ('confirmed', 'paid', 'shipped', 'done')) s,
                     coalesce(sum(total_paise) filter (where status in ('confirmed', 'paid', 'shipped', 'done')), 0) p,
                     coalesce(sum((select sum((a->>'discountPaise')::int) from jsonb_array_elements(offers) a
                                   where a->>'offerId' = 'coupon:' || coupon_code)), 0) d
                from ord where coupon_code <> '' group by coupon_code) x), '[]'::jsonb),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', to_char(day, 'YYYY-MM-DD'), 'views', views, 'visits', visits, 'orders', orders, 'salesPaise', sales) order by day)
        from days where views > 0 or visits > 0 or orders > 0), '[]'::jsonb)
  );
$$;
revoke all on function public.shop_stats(timestamptz) from public, anon, authenticated;
grant execute on function public.shop_stats(timestamptz) to service_role;

