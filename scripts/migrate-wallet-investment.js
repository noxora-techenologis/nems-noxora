const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const statements = [
  `CREATE TABLE IF NOT EXISTS wallets (
    wallet_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) UNIQUE NOT NULL,
    owner_id INT,
    employee_id INT,
    balance DECIMAL(15,2) DEFAULT 0,
    total_deposited DECIMAL(15,2) DEFAULT 0,
    total_withdrawn DECIMAL(15,2) DEFAULT 0,
    total_invested DECIMAL(15,2) DEFAULT 0,
    total_earned DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS wallet_transactions (
    transaction_id SERIAL PRIMARY KEY,
    wallet_id INT REFERENCES wallets(wallet_id) NOT NULL,
    type VARCHAR(30) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2),
    reference_type VARCHAR(50),
    reference_id INT,
    description TEXT,
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS topup_requests (
    request_id SERIAL PRIMARY KEY,
    wallet_id INT REFERENCES wallets(wallet_id) NOT NULL,
    user_id INT REFERENCES users(user_id) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'بنكيلي',
    proof_url TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    approved_by INT,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS project_investments (
    investment_id SERIAL PRIMARY KEY,
    project_id INT REFERENCES projects(project_id) NOT NULL,
    wallet_id INT REFERENCES wallets(wallet_id) NOT NULL,
    user_id INT REFERENCES users(user_id) NOT NULL,
    owner_id INT,
    employee_id INT,
    amount DECIMAL(15,2) NOT NULL,
    investment_percentage DECIMAL(7,4) DEFAULT 0,
    roi_earned DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    invested_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS project_proposals (
    proposal_id SERIAL PRIMARY KEY,
    project_id INT REFERENCES projects(project_id) NOT NULL,
    user_id INT REFERENCES users(user_id) NOT NULL,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS project_votes (
    vote_id SERIAL PRIMARY KEY,
    proposal_id INT REFERENCES project_proposals(proposal_id) NOT NULL,
    user_id INT REFERENCES users(user_id) NOT NULL,
    investment_id INT REFERENCES project_investments(investment_id),
    choice VARCHAR(20) NOT NULL,
    weight DECIMAL(15,4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    UNIQUE(proposal_id, user_id)
  )`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget_target DECIMAL(15,2) DEFAULT 0`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS min_investment DECIMAL(15,2) DEFAULT 0`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS total_invested DECIMAL(15,2) DEFAULT 0`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS profit_amount DECIMAL(15,2) DEFAULT 0`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_investable BOOLEAN DEFAULT FALSE`,
];

async function migrate() {
  try {
    console.log(`Running ${statements.length} migration statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      try {
        await pool.query(statements[i]);
        const firstLine = statements[i].split('\n')[0].substring(0, 80);
        console.log(`  [${i+1}/${statements.length}] OK: ${firstLine}...`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`  [${i+1}/${statements.length}] SKIP (already exists)`);
        } else {
          console.error(`  [${i+1}/${statements.length}] ERROR: ${err.message}`);
        }
      }
    }

    console.log('\n--- Creating wallets for existing users ---');

    const ownersRes = await pool.query(`SELECT o.owner_id, o.user_id, o.name FROM owners o WHERE o.status = 'active'`);
    for (const owner of ownersRes.rows) {
      try {
        await pool.query(
          `INSERT INTO wallets (user_id, owner_id, balance, created_at) VALUES ($1, $2, 0, NOW()) ON CONFLICT (user_id) DO NOTHING`,
          [owner.user_id, owner.owner_id]
        );
        console.log(`  Wallet for owner: ${owner.name} (user_id=${owner.user_id})`);
      } catch (e) {
        console.log(`  SKIP owner ${owner.name}: ${e.message}`);
      }
    }

    const empRes = await pool.query(`SELECT e.employee_id, e.user_id, e.name FROM employees e WHERE e.status = 'active' AND e.user_id IS NOT NULL`);
    for (const emp of empRes.rows) {
      try {
        await pool.query(
          `INSERT INTO wallets (user_id, employee_id, balance, created_at) VALUES ($1, $2, 0, NOW()) ON CONFLICT (user_id) DO NOTHING`,
          [emp.user_id, emp.employee_id]
        );
        console.log(`  Wallet for employee: ${emp.name} (user_id=${emp.user_id})`);
      } catch (e) {
        console.log(`  SKIP employee ${emp.name}: ${e.message}`);
      }
    }

    const walletCount = await pool.query('SELECT COUNT(*) FROM wallets');
    console.log(`\nTotal wallets: ${walletCount.rows[0].count}`);
    console.log('\nMigration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
