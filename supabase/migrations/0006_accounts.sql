-- Customer accounts: sign in with an emailed code, no passwords. An account
-- keeps the customer's saved details, wishlist and the orders they placed so
-- they follow them to a new phone or the website. Additive only.

create table if not exists public.accounts (
  email       text primary key check (email = lower(email) and char_length(email) <= 254),
  name        text not null default '' check (char_length(name) <= 60),
  -- Saved details, taste (college, vibes, wishlist) and order links (number + key).
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- One live sign-in code per email, stored hashed and short-lived.
create table if not exists public.login_codes (
  email       text primary key,
  code_hash   text not null,
  expires_at  timestamptz not null,
  sent_at     timestamptz not null default now(),
  tries       int not null default 0
);

-- Same access model as every other table: RLS on, no policies, so only the
-- server (service role) can read or write.
alter table public.accounts enable row level security;
alter table public.login_codes enable row level security;
