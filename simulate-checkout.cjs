const http = require('http');

const req = http.request(
  'http://localhost:3000/api/checkout',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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

req.write(
  JSON.stringify({
    items: [
      {
        id: "test-item-1",
        productId: null, 
        name: "Test Sticker",
        price_cents: 9900,
        quantity: 1,
      },
    ],
    shippingAddress: {
      name: "Test User",
      phone: "9999999999",
      address: "123 Test Street",
      pincode: "110001",
    },
    paymentMethod: "whatsapp",
  })
);
req.end();
