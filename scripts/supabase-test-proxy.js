const http = require('http');

const TARGET_PORT = 54322;

const server = http.createServer((req, res) => {
  let targetPath = req.url;
  if (targetPath.startsWith('/rest/v1')) {
    targetPath = targetPath.replace('/rest/v1', '') || '/';
  }

  const options = {
    hostname: 'localhost',
    port: TARGET_PORT,
    path: targetPath,
    method: req.method,
    headers: { ...req.headers, host: `localhost:${TARGET_PORT}` },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  });

  req.pipe(proxyReq, { end: true });
});

server.listen(54321, () => {
  console.log('Supabase Test Proxy listening on port 54321 -> PostgREST 54322');
});
