import http from 'http';

const token = process.argv[2];
if (!token) {
  console.error('Usage: node sse-client.js <token>');
  process.exit(1);
}

const options = {
  hostname: 'localhost',
  port: 5006,
  path: '/api/orders/stream',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
};

const req = http.request(options, (res) => {
  console.log('SSE connected, status', res.statusCode);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    process.stdout.write(chunk);
  });
  res.on('end', () => console.log('SSE ended'));
});

req.on('error', (e) => {
  console.error('SSE error', e);
});

req.end();
