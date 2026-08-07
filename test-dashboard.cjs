const http = require('http');

const req = http.request(
  'http://localhost:3000/api/admin/dashboard',
  {
    method: 'GET',
    headers: {
      'Cookie': 'snv_admin_token=snv_admin_master_token_override',
    },
  },
  (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('STATUS:', res.statusCode);
      console.log('DATA:', data);
    });
  }
);
req.end();
