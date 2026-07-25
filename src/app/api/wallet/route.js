import { NextResponse } from 'next/server';
import { getTable, insertRecord, query } from '@/lib/db';

/**
 * GET /api/wallet?userId=X
 * Returns wallet balance + transaction history for a user.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId مطلوب' }, { status: 400 });

    const wallets = await getTable('wallets');
    const wallet = wallets.find(w => w.user_id === Number(userId));
    if (!wallet) return NextResponse.json({ wallet: null, transactions: [], topup_requests: [] });

    const allTxns = await getTable('wallet_transactions');
    const transactions = allTxns
      .filter(t => t.wallet_id === wallet.wallet_id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 100);

    const allTopups = await getTable('topup_requests');
    const topup_requests = allTopups
      .filter(t => t.wallet_id === wallet.wallet_id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return NextResponse.json({ wallet, transactions, topup_requests });
  } catch (err) {
    console.error('Wallet GET Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/wallet
 * Body: { action: 'topup' | 'withdraw', userId, amount, payment_method?, proof_url?, notes?, owner_id?, employee_id? }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, userId, amount, payment_method, proof_url, notes, owner_id, employee_id } = body;

    if (!userId || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
    }

    if (action === 'topup') {
      return await handleTopup(Number(userId), Number(amount), payment_method, proof_url, notes, owner_id, employee_id);
    }

    if (action === 'withdraw') {
      return await handleWithdraw(Number(userId), Number(amount), notes, owner_id, employee_id);
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (err) {
    console.error('Wallet POST Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function handleTopup(userId, amount, payment_method, proof_url, notes, owner_id, employee_id) {
  const wallets = await getTable('wallets');
  let wallet = wallets.find(w => w.user_id === userId);

  if (!wallet) {
    wallet = await insertRecord('wallets', {
      user_id: userId,
      owner_id: owner_id || null,
      employee_id: employee_id || null,
      balance: 0,
    });
  }

  const topupRequest = await insertRecord('topup_requests', {
    wallet_id: wallet.wallet_id,
    user_id: userId,
    amount,
    payment_method: payment_method || 'بنكيلي',
    proof_url: proof_url || null,
    notes: notes || null,
    status: 'pending',
  });

  return NextResponse.json({
    success: true,
    message: `تم إرسال طلب شحن بمبلغ ${amount} MRU. في انتظار موافقة المحاسب.`,
    topup_request: topupRequest,
  });
}

async function handleWithdraw(userId, amount, notes, owner_id, employee_id) {
  const wallets = await getTable('wallets');
  const wallet = wallets.find(w => w.user_id === userId);

  if (!wallet) {
    return NextResponse.json({ error: 'لا توجد محفظة لك' }, { status: 400 });
  }

  if (Number(wallet.balance) < amount) {
    return NextResponse.json({ error: `الرصيد غير كافٍ. المتاح: ${wallet.balance} MRU` }, { status: 400 });
  }

  // Deduct from wallet immediately (pending FM review)
  const newBalance = Number(wallet.balance) - amount;

  const { updateRecord } = await import('@/lib/db');
  await updateRecord('wallets', wallet.wallet_id, {
    balance: newBalance,
    total_withdrawn: Number(wallet.total_withdrawn || 0) + amount,
  }, userId);

  const txn = await insertRecord('wallet_transactions', {
    wallet_id: wallet.wallet_id,
    type: 'withdrawal',
    amount,
    balance_after: newBalance,
    reference_type: 'withdrawal_request',
    description: notes || `سحب ${amount} MRU`,
    status: 'completed',
  });

  return NextResponse.json({
    success: true,
    message: `تم سحب ${amount} MRU من محفظتك. الرصيد الحالي: ${newBalance} MRU`,
    transaction: txn,
    new_balance: newBalance,
  });
}
