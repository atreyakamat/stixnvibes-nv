const { createClient } = require('@supabase/supabase-js');

const url = 'http://localhost:54321';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoicG9zdGdyZXMiLCJpc3MiOiJzdXBhYmFzZSJ9.k0DXOQUlsyAUqejD6w26jE239K0J2sz-P58ErlbVvbs';
const supabase = createClient(url, key);

async function runConcurrencyTests() {
  console.log('=== GATE 12: REAL POSTGRES CONCURRENCY TEST ===');
  
  // Setup RCOD-CONCURRENCY-TEST SKU
  const productId = '44444444-4444-4444-4444-444444444444';
  
  // TEST A: stock = 1, 10 simultaneous decrements
  await supabase.from('products').update({ stock: 1 }).eq('id', productId);
  console.log('TEST A: Reset stock to 1');

  const promisesA = [];
  for (let i = 0; i < 10; i++) {
    promisesA.push(supabase.rpc('decrement_stock', {
      p_id: productId,
      qty: 1,
      operator_name: 'test_concurrency_a',
      reason_text: 'test'
    }));
  }

  const resultsA = await Promise.all(promisesA);
  const successA = resultsA.filter(r => r.data && r.data.success === true).length;
  const rejectedA = resultsA.filter(r => r.data && r.data.success === false).length;
  const { data: prodA } = await supabase.from('products').select('stock').eq('id', productId).single();

  console.log(`TEST A Results -> Success: ${successA}, Rejected: ${rejectedA}, Final Stock: ${prodA.stock}`);

  // TEST B: stock = 10, 20 simultaneous decrements
  await supabase.from('products').update({ stock: 10 }).eq('id', productId);
  console.log('TEST B: Reset stock to 10');

  const promisesB = [];
  for (let i = 0; i < 20; i++) {
    promisesB.push(supabase.rpc('decrement_stock', {
      p_id: productId,
      qty: 1,
      operator_name: 'test_concurrency_b',
      reason_text: 'test'
    }));
  }

  const resultsB = await Promise.all(promisesB);
  const successB = resultsB.filter(r => r.data && r.data.success === true).length;
  const rejectedB = resultsB.filter(r => r.data && r.data.success === false).length;
  const { data: prodB } = await supabase.from('products').select('stock').eq('id', productId).single();

  console.log(`TEST B Results -> Success: ${successB}, Rejected: ${rejectedB}, Final Stock: ${prodB.stock}`);

  const { count: logCount } = await supabase.from('inventory_logs').select('*', { count: 'exact' }).eq('product_id', productId);
  console.log(`Inventory logs count for SKU: ${logCount}`);

  console.log('\n=== GATE 13: TRANSACTION ROLLBACK TEST ===');
  // Attempt invalid checkout with insufficient stock to verify atomicity
  await supabase.from('products').update({ stock: 0 }).eq('id', productId);
  const failedOrderId = '99999999-9999-9999-9999-999999999999';
  const failedItemId = '88888888-8888-8888-8888-888888888888';

  const checkoutRes = await supabase.rpc('create_checkout_transaction', {
    p_order: {
      id: failedOrderId,
      customer_name: 'Rollback Test',
      customer_phone: '7744020601',
      address: 'Test Addr',
      pincode: '110001',
      total_cents: 1000,
      status: 'created'
    },
    p_items: [
      {
        id: failedItemId,
        product_id: productId,
        name: 'Failed Item',
        quantity: 5,
        price_cents: 200
      }
    ]
  });

  console.log('Checkout RPC response on failure:', checkoutRes.data);

  // Verify rollback: check if order or order_items exist
  const { data: orderCheck } = await supabase.from('orders').select('*').eq('id', failedOrderId);
  const { data: itemCheck } = await supabase.from('order_items').select('*').eq('id', failedItemId);

  console.log(`Rollback check -> Order count: ${orderCheck.length}, Item count: ${itemCheck.length}`);

  return {
    testAPass: successA === 1 && rejectedA === 9 && prodA.stock === 0,
    testBPass: successB === 10 && rejectedB === 10 && prodB.stock === 0,
    rollbackPass: checkoutRes.data.success === false && orderCheck.length === 0 && itemCheck.length === 0
  };
}

runConcurrencyTests().then(res => {
  console.log('\nCONCURRENCY & ATOMOCITY SUMMARY:', res);
  process.exit(res.testAPass && res.testBPass && res.rollbackPass ? 0 : 1);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
