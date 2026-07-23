const https = require('https');

function put(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = https.request({
      hostname: 'nems-noxora.vercel.app',
      path,
      method: 'PUT',
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
  // Test employee update
  const r1 = await put('/api/data/employees', { _id: 1, job_title: 'Senior Manager', basic_salary: 5000, allowances: 1000, employment_status: 'active' });
  console.log('PUT employees:', r1.status, r1.body.substring(0, 200));

  // Test client update
  const r2 = await put('/api/data/clients', { _id: 4, communication_log: [{ id: 1, type: 'call', date: '2026-07-23', notes: 'test call', logged_by: 'Admin' }] });
  console.log('PUT clients:', r2.status, r2.body.substring(0, 200));

  // Test project update
  const r3 = await put('/api/data/projects', { _id: 1, progress: 50, health_score: 90 });
  console.log('PUT projects:', r3.status, r3.body.substring(0, 200));
}

test().catch(console.error);
