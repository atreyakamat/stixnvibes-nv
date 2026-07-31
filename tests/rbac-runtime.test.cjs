const http = require('http');

function request(path, headers = {}) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3009,
      path: path,
      method: 'GET',
      headers: headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', (err) => resolve({ status: 500, error: err.message }));
    req.end();
  });
}

async function testRBAC() {
  console.log('=== GATE 14: RBAC RUNTIME TEST ===');
  const routes = ['/api/admin/orders', '/api/admin/inventory', '/api/admin/operations'];

  for (const r of routes) {
    // 1. Anonymous
    const anon = await request(r);
    console.log(`Anon -> ${r}: Status ${anon.status}`);

    // 2. Malformed
    const malformed = await request(r, { 'Authorization': 'Bearer malformed_token_123' });
    console.log(`Malformed -> ${r}: Status ${malformed.status}`);

    // 3. Static Admin
    const admin = await request(r, { 'Authorization': 'Bearer snv_admin_token_static_dev' });
    console.log(`Admin -> ${r}: Status ${admin.status}`);
  }
}

testRBAC().catch(console.error);
