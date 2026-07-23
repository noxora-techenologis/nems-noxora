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
  // Test clients
  const r1 = await post('/api/data/clients', { name: 'test client api', email: 'testapi@test.com', phone: '050000', company: 'Test', address: 'Riyadh', country: 'SA', value_score: 80, status: 'active', communication_log: [] });
  console.log('POST clients:', r1.status, r1.body.substring(0, 200));

  // Test employees
  const r2 = await post('/api/data/employees', { name: 'test emp', user_id: 1, department_id: 1, job_title: 'Manager', hire_date: '2026-01-01', status: 'active', employment_status: 'active', allowances: 500 });
  console.log('POST employees:', r2.status, r2.body.substring(0, 200));

  // Test projects
  const r3 = await post('/api/data/projects', { name: 'Test Project', description: 'Test', status: 'active', budget: 100000, priority: 'high', currency: 'MRU', health_score: 100 });
  console.log('POST projects:', r3.status, r3.body.substring(0, 200));
}

test().catch(console.error);
