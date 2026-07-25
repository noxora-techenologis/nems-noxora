/**
 * NEMS Fee Calculation Utilities
 * Handles withdrawal and deposit fee calculations with proper rounding
 * to avoid floating-point errors in financial operations.
 *
 * WITHDRAWAL FEES:
 *   - Amount < 400 MRU: 5% fee
 *   - Amount >= 400 MRU: 2% fee
 *
 * DEPOSIT FEES:
 *   - Amount < 1000 MRU: 0% fee
 *   - Amount >= 1000 MRU: 2% fee
 *
 * All amounts are rounded to 2 decimal places using Math.round(x * 100) / 100
 * to prevent floating-point precision issues with MRU currency.
 */

const WITHDRAWAL_FEE_HIGH = 0.05; // 5% for amounts < 400
const WITHDRAWAL_FEE_LOW = 0.02;  // 2% for amounts >= 400
const WITHDRAWAL_THRESHOLD = 400;

const DEPOSIT_FEE = 0.02;         // 2% for amounts >= 1000
const DEPOSIT_THRESHOLD = 1000;

/**
 * Safely round a number to 2 decimal places (MRU currency).
 * Uses Math.round to avoid floating-point errors like 0.1 + 0.2 = 0.30000000000000004
 */
export function roundMRU(amount) {
  return Math.round(Number(amount) * 100) / 100;
}

/**
 * Calculate withdrawal fee based on amount.
 * @param {number} amount - The withdrawal amount in MRU
 * @returns {{ fee: number, netAmount: number, feePercent: number, tier: string }}
 */
export function calcWithdrawalFee(amount) {
  const amt = Number(amount) || 0;
  if (amt <= 0) return { fee: 0, netAmount: 0, feePercent: 0, tier: 'none' };

  let feePercent;
  let tier;

  if (amt < WITHDRAWAL_THRESHOLD) {
    feePercent = WITHDRAWAL_FEE_HIGH;
    tier = `${(WITHDRAWAL_FEE_HIGH * 100)}% (أقل من ${WITHDRAWAL_THRESHOLD} MRU)`;
  } else {
    feePercent = WITHDRAWAL_FEE_LOW;
    tier = `${(WITHDRAWAL_FEE_LOW * 100)}% (${WITHDRAWAL_THRESHOLD} MRU فأكثر)`;
  }

  const fee = roundMRU(amt * feePercent);
  const netAmount = roundMRU(amt - fee);

  return { fee, netAmount, feePercent, tier };
}

/**
 * Calculate deposit fee based on amount.
 * @param {number} amount - The deposit amount in MRU
 * @returns {{ fee: number, creditedAmount: number, feePercent: number, tier: string }}
 */
export function calcDepositFee(amount) {
  const amt = Number(amount) || 0;
  if (amt <= 0) return { fee: 0, creditedAmount: 0, feePercent: 0, tier: 'none' };

  let feePercent;
  let tier;

  if (amt < DEPOSIT_THRESHOLD) {
    feePercent = 0;
    tier = 'بدون عمولة (أقل من 1000 MRU)';
  } else {
    feePercent = DEPOSIT_FEE;
    tier = `${(DEPOSIT_FEE * 100)}% (${DEPOSIT_THRESHOLD} MRU فأكثر)`;
  }

  const fee = roundMRU(amt * feePercent);
  const creditedAmount = roundMRU(amt - fee);

  return { fee, creditedAmount, feePercent, tier };
}
