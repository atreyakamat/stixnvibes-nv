-- Starter catalog: the 17 lo-fi designs from stixnvibes.com and one pack.
-- Prices are NULL on purpose: set them in /admin/products. Until a product
-- has a price it shows on the shop as "Ask on Instagram" and can't be bought.
-- Safe to re-run.

insert into public.products (id, slug, name, category, description, details, images, tags, active, featured, sort_order)
select
  'p-lofi-' || lpad(n::text, 2, '0'),
  'lofi-' || lpad(n::text, 2, '0'),
  'Lo-fi sticker ' || lpad(n::text, 2, '0'),
  'stickers',
  'From our lo-fi series.',
  'Printed on waterproof paper vinyl. Handles splashes, bottles and bags. Peel and stick on any clean, smooth surface.',
  array['/lofi/lofi-' || lpad(n::text, 2, '0') || '.webp'],
  array['lo-fi'],
  true,
  n <= 8,
  n
from generate_series(1, 17) as n
on conflict (id) do nothing;

insert into public.product_variants (id, product_id, label, price_paise, stock, active, sort_order)
select 'v-lofi-' || lpad(n::text, 2, '0'), 'p-lofi-' || lpad(n::text, 2, '0'), 'Single sticker', null, null, true, 0
from generate_series(1, 17) as n
on conflict (id) do nothing;

insert into public.products (id, slug, name, category, description, details, images, tags, active, featured, sort_order)
values (
  'p-lofi-pack', 'lofi-pack', 'Lo-fi sticker pack', 'packs',
  'A set of lo-fi designs that belong together. Pick a pack. Set your vibe.',
  'Printed on waterproof paper vinyl. Handles splashes, bottles and bags. Peel and stick on any clean, smooth surface.',
  array['/lofi/lofi-09.webp', '/lofi/lofi-12.webp', '/lofi/lofi-07.webp'],
  array['lo-fi', 'pack'], true, true, 0
)
on conflict (id) do nothing;

insert into public.product_variants (id, product_id, label, price_paise, stock, active, sort_order)
values ('v-lofi-pack', 'p-lofi-pack', 'Pack', null, null, true, 0)
on conflict (id) do nothing;

-- Shop starts closed. Open it from /admin/settings once prices and UPI are set.
insert into public.settings (id, data) values (1, '{}'::jsonb) on conflict (id) do nothing;
