-- v7: stalls and stall sales (stall mode), unit costs, India Post tracking,
-- blog, photo library and college pages. Additive only: every new column
-- has a default, so the v6 code keeps working while this runs.

-- Products: what one unit costs to make. null = use the default for its
-- type (and picked size) from Settings.
alter table public.products add column if not exists cost_paise integer check (cost_paise is null or cost_paise >= 0);

-- Orders: India Post consignment number once shipped.
alter table public.orders add column if not exists tracking_number text not null default '';

-- Colleges ---------------------------------------------------------------
-- A page per college at /c/<slug>, with its code, picks, stalls and photos.
create table if not exists public.colleges (
  id           text primary key default gen_random_uuid()::text,
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name         text not null check (char_length(name) between 1 and 120),
  area         text not null default '',
  description  text not null default '',
  image        text not null default '',
  -- A coupon code shown on the page, or ''.
  coupon_code  text not null default '',
  -- Hand-picked products shown first.
  product_ids  text[] not null default '{}',
  active       boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);
alter table public.colleges enable row level security;

-- Stalls -----------------------------------------------------------------
-- One row per pop-up: what it cost to be there. Sales are in stall_sales.
create table if not exists public.stalls (
  id                text primary key default gen_random_uuid()::text,
  name              text not null check (char_length(name) between 1 and 120),
  -- The day, in India time.
  date              date not null,
  venue             text not null default '',
  college_id        text references public.colleges(id) on delete set null,
  fee_paise         integer not null default 0 check (fee_paise >= 0),
  -- Travel, table rent, anything else spent for this stall.
  other_costs_paise integer not null default 0 check (other_costs_paise >= 0),
  notes             text not null default '',
  -- Shown on the college page and home page as "find us next".
  public            boolean not null default true,
  created_at        timestamptz not null default now()
);
create index if not exists stalls_date_idx on public.stalls(date desc);
alter table public.stalls enable row level security;

-- Sales made in stall mode. The id is made on the phone, so a sale synced
-- twice (flaky signal) is stored once.
create table if not exists public.stall_sales (
  id              text primary key check (id ~ '^[a-zA-Z0-9-]{8,64}$'),
  stall_id        text references public.stalls(id) on delete set null,
  -- [{productId, name, type, options, qty, unitPricePaise, lineTotalPaise}]
  lines           jsonb not null,
  subtotal_paise  integer not null check (subtotal_paise >= 0),
  discount_paise  integer not null default 0 check (discount_paise >= 0),
  total_paise     integer not null check (total_paise >= 0),
  payment         text not null check (payment in ('cash', 'upi')),
  note            text not null default '',
  -- When it was sold (the phone's clock), not when it synced.
  sold_at         timestamptz not null,
  created_at      timestamptz not null default now()
);
create index if not exists stall_sales_stall_idx on public.stall_sales(stall_id, sold_at desc);
create index if not exists stall_sales_sold_idx on public.stall_sales(sold_at desc);
alter table public.stall_sales enable row level security;

-- Blog -------------------------------------------------------------------
create table if not exists public.blog_posts (
  id            text primary key default gen_random_uuid()::text,
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title         text not null check (char_length(title) between 1 and 160),
  excerpt       text not null default '',
  -- Markdown.
  body          text not null default '',
  cover         text not null default '',
  tags          text[] not null default '{}',
  status        text not null default 'draft' check (status in ('draft', 'published')),
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists blog_posts_published_idx on public.blog_posts(status, published_at desc);
alter table public.blog_posts enable row level security;

-- Photo library ----------------------------------------------------------
create table if not exists public.gallery_items (
  id          text primary key default gen_random_uuid()::text,
  image       text not null,
  caption     text not null default '',
  stall_id    text references public.stalls(id) on delete set null,
  college_id  text references public.colleges(id) on delete set null,
  tags        text[] not null default '{}',
  taken_on    date,
  visible     boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists gallery_items_created_idx on public.gallery_items(created_at desc);
alter table public.gallery_items enable row level security;

-- Same access model as every other table: RLS on, no policies, so only the
-- server (service role) can read or write.
