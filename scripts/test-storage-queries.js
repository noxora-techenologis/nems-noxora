const { Pool } = require('pg');

const connStr = 'postgresql://neondb_owner:npg_Mx2LkwqnmG3p@ep-wild-heart-ayb4bk6o-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

async function test() {
  const client = await pool.connect();
  try {
    // Test 1: pg_database_size
    try {
      const r1 = await client.query('SELECT pg_database_size(current_database()) AS size');
      console.log('1. pg_database_size OK:', r1.rows[0].size);
    } catch (e) {
      console.log('1. pg_database_size FAILED:', e.message);
    }

    // Test 2: pg_total_relation_size
    try {
      const r2 = await client.query("SELECT pg_total_relation_size('users') AS size");
      console.log('2. pg_total_relation_size OK:', r2.rows[0].size);
    } catch (e) {
      console.log('2. pg_total_relation_size FAILED:', e.message);
    }

    // Test 3: pg_indexes_size
    try {
      const r3 = await client.query("SELECT pg_indexes_size('users') AS size");
      console.log('3. pg_indexes_size OK:', r3.rows[0].size);
    } catch (e) {
      console.log('3. pg_indexes_size FAILED:', e.message);
    }

    // Test 4: reltuples from pg_class
    try {
      const r4 = await client.query("SELECT reltuples::bigint AS cnt FROM pg_class WHERE relname = 'users'");
      console.log('4. reltuples OK:', r4.rows[0]?.cnt);
    } catch (e) {
      console.log('4. reltuples FAILED:', e.message);
    }

    // Test 5: pg_indexes
    try {
      const r5 = await client.query("SELECT COUNT(*) AS cnt FROM pg_indexes WHERE schemaname = 'public'");
      console.log('5. pg_indexes OK:', r5.rows[0].cnt);
    } catch (e) {
      console.log('5. pg_indexes FAILED:', e.message);
    }

    // Test 6: pg_stat_activity
    try {
      const r6 = await client.query("SELECT COUNT(*) AS cnt FROM pg_stat_activity WHERE datname = current_database() AND state = 'active'");
      console.log('6. pg_stat_activity OK:', r6.rows[0].cnt);
    } catch (e) {
      console.log('6. pg_stat_activity FAILED:', e.message);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

test();
