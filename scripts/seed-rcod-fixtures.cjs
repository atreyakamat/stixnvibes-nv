const { createClient } = require('@supabase/supabase-js');

const url = 'http://localhost:54321';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoicG9zdGdyZXMiLCJpc3MiOiJzdXBhYmFzZSJ9.k0DXOQUlsyAUqejD6w26jE239K0J2sz-P58ErlbVvbs';

const supabase = createClient(url, key);

async function seed() {
  console.log('Seeding RCOD test fixtures into real PostgreSQL...');

  const products = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'RCOD Standard Sticker',
      slug: 'rcod-standard-product',
      description: 'Standard vinyl sticker for testing',
      price_cents: 29900,
      currency: 'INR',
      type: 'sticker_vinyl',
      stock: 100,
      customizable: false,
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'RCOD Custom Sticker',
      slug: 'rcod-custom-product',
      description: 'Customizable sticker for testing',
      price_cents: 39900,
      currency: 'INR',
      type: 'sticker',
      stock: 50,
      customizable: true,
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'RCOD Out of Stock Product',
      slug: 'rcod-out-of-stock',
      description: 'Zero stock product for test validation',
      price_cents: 19900,
      currency: 'INR',
      type: 'poster',
      stock: 0,
      customizable: false,
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      name: 'RCOD Concurrency Test Product',
      slug: 'rcod-concurrency-test',
      description: 'Concurrency test product',
      price_cents: 1000,
      currency: 'INR',
      type: 'sticker',
      stock: 10,
      customizable: false,
    }
  ];

  for (const p of products) {
    const { error } = await supabase.from('products').upsert(p, { onConflict: 'id' });
    if (error) console.error('Error seeding product', p.slug, error);
    else console.log('Seeded product:', p.slug);
  }

  console.log('RCOD Fixture seeding complete.');
}

seed().catch(console.error);
