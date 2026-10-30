-- Reviews: customers rate a product, optionally with photos. Every review
-- starts as pending; the admin publishes, hides or replies. Additive only.

create table if not exists public.reviews (
  id            text primary key default gen_random_uuid()::text,
  product_id    text not null references public.products(id) on delete cascade,
  -- Set only when the buyer proved the order (number + key): "verified buyer".
  order_number  text references public.orders(number) on delete set null,
  name          text not null check (char_length(name) between 1 and 60),
  instagram     text not null default '' check (instagram ~ '^[a-z0-9._]{0,30}$'),
  rating        smallint not null check (rating between 1 and 5),
  body          text not null default '' check (char_length(body) <= 1000),
  -- Upload ids (see public.uploads), opened at /u/<id>.
  photos        text[] not null default '{}' check (cardinality(photos) <= 3),
  status        text not null default 'pending' check (status in ('pending', 'published', 'hidden')),
  reply         text not null default '' check (char_length(reply) <= 1000),
  replied_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists reviews_product_idx on public.reviews(product_id, status, created_at desc);
create index if not exists reviews_status_idx on public.reviews(status, created_at desc);
-- One review per product per verified order.
create unique index if not exists reviews_order_product_idx on public.reviews(order_number, product_id) where order_number is not null;

-- Same access model as every other table: RLS on, no policies, so only the
-- server (service role) can read or write.
alter table public.reviews enable row level security;
