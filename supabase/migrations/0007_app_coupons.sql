-- App-only coupons, free stickers, first-order-only and a bigger-order bonus.
-- Safe to run twice; adds columns only.
alter table public.coupons
  add column if not exists app_only boolean not null default false,
  add column if not exists free_stickers int not null default 0 check (free_stickers between 0 and 50),
  add column if not exists first_order_only boolean not null default false,
  add column if not exists bonus_above_paise int check (bonus_above_paise is null or bonus_above_paise > 0),
  add column if not exists bonus_stickers int not null default 0 check (bonus_stickers between 0 and 50);
