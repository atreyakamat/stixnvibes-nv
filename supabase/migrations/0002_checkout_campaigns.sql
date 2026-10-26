-- v4: customer details at checkout, order pages, campaigns and the InWoice
-- sync. Additive only: every new column has a default, so code from before
-- this migration keeps working while it runs.

-- Orders: who to deliver to, and a secret for the customer's order page.
alter table public.orders add column if not exists customer_phone text not null default '';
alter table public.orders add column if not exists fulfilment text not null default 'delivery';
alter table public.orders add column if not exists address jsonb not null default '{}';
alter table public.orders add column if not exists view_key text not null default '';

do $$ begin
  alter table public.orders add constraint orders_fulfilment_check check (fulfilment in ('delivery', 'pickup'));
exception when duplicate_object then null; end $$;

create index if not exists orders_phone_idx on public.orders(customer_phone);
-- InWoice pulls orders changed since its last sync.
create index if not exists orders_updated_idx on public.orders(updated_at);

-- Offers: % off campaigns with a date window and a banner.
alter table public.offers add column if not exists percent integer check (percent is null or percent between 1 and 90);
alter table public.offers add column if not exists starts_at timestamptz;
alter table public.offers add column if not exists ends_at timestamptz;
alter table public.offers add column if not exists banner text not null default '';

-- The kind list grows from (bxgy, volume) to include percent. The new check
-- is added before the old one goes, so offers are never unchecked.
do $$ begin
  alter table public.offers add constraint offers_kind_v4_check check (kind in ('bxgy', 'volume', 'percent'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.offers add constraint offers_percent_v4_check check (kind <> 'percent' or percent is not null);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.offers add constraint offers_volume_price_v4_check check (kind <> 'volume' or price_paise is not null);
exception when duplicate_object then null; end $$;
-- offers_check was "bxgy or has a price", which would reject percent offers.
alter table public.offers drop constraint if exists offers_kind_check;
alter table public.offers drop constraint if exists offers_check;
