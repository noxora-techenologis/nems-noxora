import { getTable } from '../src/lib/db.js';
const reqs = await getTable('position_requests');
console.log('Columns:', Object.keys(reqs[0] || {}));
console.log('Count:', reqs.length);
for (const r of reqs) {
  console.log(JSON.stringify(r));
}
process.exit(0);
