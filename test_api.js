async function run() {
  const urls = [
    'http://localhost:3000/api/admin/orders',
    'http://localhost:3000/api/admin/inventory',
    'http://localhost:3000/api/admin/dashboard'
  ];
  for (const url of urls) {
    console.log('Testing', url);
    const res = await fetch(url, { headers: { 'Authorization': 'Bearer test' } });
    const text = await res.text();
    console.log(res.status, text.substring(0, 100));
  }
}
run();
