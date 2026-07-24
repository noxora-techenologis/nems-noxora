const https = require('https');

function post(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = https.request({
      hostname: 'nems-noxora.vercel.app',
      path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function test() {
  const r = await post('/api/auth/login', { email: 'admin@noxora.com', password: 'admin123' });
  console.log('Login:', r.status, r.body);
}
test().catch(console.error);
