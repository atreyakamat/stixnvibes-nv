-- App-only coupons and free stickers. Safe to run twice; adds columns only.
alter table public.coupons
  add column if not exists app_only boolean not null default false,
  add column if not exists free_stickers int not null default 0 check (free_stickers between 0 and 50);
