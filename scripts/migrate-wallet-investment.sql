-- NEMS Migration: Wallet + Investment + Governance System
-- Run: node scripts/migrate-wallet-investment.js

-- 1. WALLET TABLES
CREATE TABLE IF NOT EXISTS wallets (
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
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  transaction_id SERIAL PRIMARY KEY,
  wallet_id INT REFERENCES wallets(wallet_id) NOT NULL,
  type VARCHAR(30) NOT NULL, -- deposit, withdrawal, investment, roi, salary, penalty
  amount DECIMAL(15,2) NOT NULL,
  balance_after DECIMAL(15,2),
  reference_type VARCHAR(50), -- project, salary, withdrawal_request, topup_request
  reference_id INT,
  description TEXT,
  status VARCHAR(20) DEFAULT 'completed', -- pending, completed, rejected
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS topup_requests (
  request_id SERIAL PRIMARY KEY,
  wallet_id INT REFERENCES wallets(wallet_id) NOT NULL,
  user_id INT REFERENCES users(user_id) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'بنكيلي',
  proof_url TEXT,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  approved_by INT,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- 2. PROJECT INVESTMENT TABLES
CREATE TABLE IF NOT EXISTS project_investments (
  investment_id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(project_id) NOT NULL,
  wallet_id INT REFERENCES wallets(wallet_id) NOT NULL,
  user_id INT REFERENCES users(user_id) NOT NULL,
  owner_id INT,
  employee_id INT,
  amount DECIMAL(15,2) NOT NULL,
  investment_percentage DECIMAL(7,4) DEFAULT 0,
  roi_earned DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active', -- active, refunded, paid_out
  invested_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_proposals (
  proposal_id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(project_id) NOT NULL,
  user_id INT REFERENCES users(user_id) NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active', -- active, approved, rejected, implemented
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_votes (
  vote_id SERIAL PRIMARY KEY,
  proposal_id INT REFERENCES project_proposals(proposal_id) NOT NULL,
  user_id INT REFERENCES users(user_id) NOT NULL,
  investment_id INT REFERENCES project_investments(investment_id),
  choice VARCHAR(20) NOT NULL, -- approve, object
  weight DECIMAL(15,4) DEFAULT 0, -- investment percentage weight
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  UNIQUE(proposal_id, user_id)
);

-- 3. ADD INVESTMENT COLUMNS TO PROJECTS TABLE
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget_target DECIMAL(15,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS min_investment DECIMAL(15,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS total_invested DECIMAL(15,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS profit_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_investable BOOLEAN DEFAULT FALSE;
