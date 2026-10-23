-- Stix N Vibes shop schema.
--
-- Access model: Row Level Security is ON for every table and there are NO
-- policies, so the public anon key can read or write nothing. The Next.js
-- server talks to Supabase with the service role key, which bypasses RLS.
-- Admin access is checked in the app (ADMIN_EMAILS allowlist).

create extension if not exists pgcrypto;

-- Products --------------------------------------------------------------

create table if not exists public.products (
  id          text primary key default gen_random_uuid()::text,
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (char_length(name) between 1 and 120),
  category    text not null check (category in ('stickers', 'packs', 'posters', 'framez', 'cards')),
  description text not null default '',
  details     text not null default '',
  images      text[] not null default '{}',
  tags        text[] not null default '{}',
  active      boolean not null default true,
  featured    boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.product_variants (
  id          text primary key default gen_random_uuid()::text,
  product_id  text not null references public.products(id) on delete cascade,
  label       text not null check (char_length(label) between 1 and 60),
  price_paise integer check (price_paise is null or price_paise >= 0),
  stock       integer check (stock is null or stock >= 0),
  active      boolean not null default true,
  sort_order  integer not null default 0
);
create index if not exists product_variants_product_idx on public.product_variants(product_id);

-- Orders ----------------------------------------------------------------
-- Items, customer and address are snapshots taken at checkout, so editing
-- or deleting a product never changes a past order.

create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  number          text not null unique check (number ~ '^SNV-[A-Z0-9]{6}$'),
  access_token    text not null,
  status          text not null check (status in (
                    'awaiting_payment', 'payment_review', 'placed', 'paid', 'packed',
                    'shipped', 'ready_for_pickup', 'delivered', 'collected', 'cancelled')),
  fulfilment      text not null check (fulfilment in ('ship', 'pickup')),
  payment_method  text not null check (payment_method in ('upi', 'pickup')),
  customer        jsonb not null,
  address         jsonb,
  notes           text not null default '',
  items           jsonb not null,
  subtotal_paise  integer not null check (subtotal_paise >= 0),
  shipping_paise  integer not null check (shipping_paise >= 0),
  total_paise     integer not null check (total_paise >= 0),
  utr             text,
  courier         text,
  tracking_number text,
  admin_note      text not null default '',
  events          jsonb not null default '[]',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists orders_status_idx on public.orders(status, created_at desc);
create index if not exists orders_created_idx on public.orders(created_at desc);
-- One UPI reference can only ever pay for one order.
create unique index if not exists orders_utr_unique on public.orders(utr) where utr is not null;

-- Custom sticker requests ----------------------------------------------

create table if not exists public.custom_requests (
  id          text primary key default gen_random_uuid()::text,
  name        text not null,
  contact     text not null,
  description text not null,
  cut         text not null,
  size        text not null default '',
  quantity    integer not null check (quantity > 0),
  file        text,
  status      text not null default 'new' check (status in ('new', 'quoted', 'accepted', 'done', 'declined')),
  admin_note  text not null default '',
  created_at  timestamptz not null default now()
);

-- Settings: a single row of JSON, edited from /admin/settings -----------

create table if not exists public.settings (
  id   integer primary key default 1 check (id = 1),
  data jsonb not null default '{}'
);

alter table public.products         enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders           enable row level security;
alter table public.custom_requests  enable row level security;
alter table public.settings         enable row level security;

-- Place an order and take stock atomically ------------------------------
-- Raises OUT_OF_STOCK:<variant id> and changes nothing if any line can't be
-- filled. Variants with stock = null are made to order and never run out.

create or replace function public.place_order(p_order jsonb)
returns public.orders
language plpgsql
security invoker
set search_path = public
as $$
declare
  line jsonb;
  updated integer;
  result public.orders;
begin
  for line in select * from jsonb_array_elements(p_order->'items') loop
    update public.product_variants
       set stock = stock - (line->>'qty')::integer
     where id = line->>'variantId'
       and active
       and stock is not null
       and stock >= (line->>'qty')::integer;
    get diagnostics updated = row_count;
    if updated = 0 then
      perform 1 from public.product_variants
       where id = line->>'variantId' and active and stock is null;
      if not found then
        raise exception 'OUT_OF_STOCK:%', line->>'variantId';
      end if;
    end if;
  end loop;

  insert into public.orders (
    number, access_token, status, fulfilment, payment_method, customer, address, notes,
    items, subtotal_paise, shipping_paise, total_paise, utr, courier, tracking_number,
    admin_note, events
  ) values (
    p_order->>'number', p_order->>'accessToken', p_order->>'status', p_order->>'fulfilment',
    p_order->>'paymentMethod', p_order->'customer', nullif(p_order->'address', 'null'::jsonb),
    coalesce(p_order->>'notes', ''), p_order->'items', (p_order->>'subtotalPaise')::integer,
    (p_order->>'shippingPaise')::integer, (p_order->>'totalPaise')::integer, null, null, null,
    '', coalesce(p_order->'events', '[]'::jsonb)
  )
  returning * into result;

  return result;
end;
$$;

create or replace function public.restock_items(p_items jsonb)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.product_variants v
     set stock = v.stock + (i->>'qty')::integer
    from jsonb_array_elements(p_items) i
   where v.id = i->>'variantId' and v.stock is not null;
$$;

create or replace function public.append_order_event(p_number text, p_event jsonb)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.orders
     set events = events || jsonb_build_array(p_event), updated_at = now()
   where number = p_number;
$$;

revoke all on function public.place_order(jsonb) from public, anon, authenticated;
revoke all on function public.restock_items(jsonb) from public, anon, authenticated;
revoke all on function public.append_order_event(text, jsonb) from public, anon, authenticated;
grant execute on function public.place_order(jsonb) to service_role;
grant execute on function public.restock_items(jsonb) to service_role;
grant execute on function public.append_order_event(text, jsonb) to service_role;

-- Storage ---------------------------------------------------------------
-- product-images is public (product photos). custom-uploads is private;
-- admin views files through short-lived signed links.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, array['image/png', 'image/jpeg', 'image/webp']),
  ('custom-uploads', 'custom-uploads', false, 8388608, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;
