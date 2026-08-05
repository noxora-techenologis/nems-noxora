import { NextResponse } from 'next/server';
import { getTable, insertRecord } from '@/lib/db';
import { calcWithdrawalFee, roundMRU } from '@/lib/fees';
import { verifySession, requireRole } from '@/lib/serverAuth';

/**
 * GET /api/wallet?userId=X
 * Users can only access their own wallet.
 */
export async function GET(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId مطلوب' }, { status: 400 });

    // Users can only access their own wallet (admins/fms can access any)
    const roleError = await requireRole(user, ['admin', 'fm', 'ceo']);
    const isAdmin = !roleError;
    if (!isAdmin && user.user_id !== Number(userId)) {
      return NextResponse.json({ error: 'غير مصرح — لا يمكنك عرض محفظة مستخدم آخر' }, { status: 403 });
    }

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

    // Also return pending withdrawal requests for this user
    const allWithdrawals = await getTable('withdrawal_requests');
    const withdrawal_requests = allWithdrawals
      .filter(w => w.user_id === Number(userId) || (wallet.owner_id && w.owner_id === wallet.owner_id))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return NextResponse.json({ wallet, transactions, topup_requests, withdrawal_requests });
  } catch (err) {
    console.error('Wallet GET Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}

/**
 * POST /api/wallet
 * Body: { action, userId, amount, ... }
 */
export async function POST(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const body = await request.json();
    const { action, userId, amount, sender_name, screenshot_url, bankily_txn_id, notes, owner_id, employee_id } = body;

    if (!userId) return NextResponse.json({ error: 'userId مطلوب' }, { status: 400 });

    // Users can only perform actions on their own wallet
    const roleError = await requireRole(user, ['admin', 'fm', 'ceo']);
    const isAdmin = !roleError;
    if (!isAdmin && user.user_id !== Number(userId)) {
      return NextResponse.json({ error: 'غير مصرح — يمكنك التعامل مع محفظتك فقط' }, { status: 403 });
    }

    if (action === 'topup') {
      if (!amount || Number(amount) <= 0) return NextResponse.json({ error: 'مبلغ غير صالح' }, { status: 400 });
      return await handleTopup(Number(userId), Number(amount), sender_name, screenshot_url, bankily_txn_id, notes, owner_id, employee_id);
    }

    if (action === 'withdraw') {
      if (!amount || Number(amount) <= 0) return NextResponse.json({ error: 'مبلغ غير صالح' }, { status: 400 });
      return await handleWithdraw(Number(userId), Number(amount), body.payment_method, body.account_details, notes, owner_id, employee_id);
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (err) {
    console.error('Wallet POST Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}

async function handleTopup(userId, amount, senderName, screenshotUrl, bankilyTxnId, notes, ownerId, employeeId) {
  if (!senderName || !senderName.trim()) {
    return NextResponse.json({ error: 'اسم صاحب الحساب المرسِل مطلوب' }, { status: 400 });
  }
  if (!bankilyTxnId || !/^\d{19}$/.test(bankilyTxnId)) {
    return NextResponse.json({ error: 'يرجى إدخال الرقم التسلسلي المكون من 19 رقماً بشكل صحيح كما هو موضح في لقطة الشاشة' }, { status: 400 });
  }
  if (!screenshotUrl) {
    return NextResponse.json({ error: 'يرجى رفع لقطة شاشة إشعار التحويل' }, { status: 400 });
  }

  const wallets = await getTable('wallets');
  let wallet = wallets.find(w => w.user_id === userId);

  if (!wallet) {
    wallet = await insertRecord('wallets', {
      user_id: userId,
      owner_id: ownerId || null,
      employee_id: employeeId || null,
      balance: 0,
    });
  }

  const topupRequest = await insertRecord('topup_requests', {
    wallet_id: wallet.wallet_id,
    user_id: userId,
    amount,
    payment_method: 'بنكيلي',
    proof_url: screenshotUrl,
    sender_name: senderName.trim(),
    bankily_txn_id: bankilyTxnId,
    notes: notes || null,
    status: 'pending',
  });

  return NextResponse.json({
    success: true,
    message: `تم إرسال طلب شحن بمبلغ ${amount} MRU عبر بنكيلي. في انتظار موافقة وكيل الشحن.`,
    topup_request: topupRequest,
  });
}

async function handleWithdraw(userId, amount, paymentMethod, accountDetails, notes, ownerId, employeeId) {
  const wallets = await getTable('wallets');
  const wallet = wallets.find(w => w.user_id === userId);

  if (!wallet) {
    return NextResponse.json({ error: 'لا توجد محفظة لك' }, { status: 400 });
  }

  // Calculate withdrawal fee
  const feeInfo = calcWithdrawalFee(amount);

  if (Number(wallet.balance) < amount) {
    return NextResponse.json({ error: `الرصيد غير كافٍ. المتاح: ${wallet.balance} MRU | المطلوب: ${amount} MRU + عمولة ${feeInfo.fee} MRU = ${feeInfo.netAmount + feeInfo.fee} MRU` }, { status: 400 });
  }

  const newBalance = roundMRU(Number(wallet.balance) - amount);

  const { updateRecord } = await import('@/lib/db');
  await updateRecord('wallets', wallet.wallet_id, {
    balance: newBalance,
    total_withdrawn: roundMRU(Number(wallet.total_withdrawn || 0) + amount),
  }, userId);

  // Record the gross withdrawal
  const txn = await insertRecord('wallet_transactions', {
    wallet_id: wallet.wallet_id,
    type: 'withdrawal',
    amount,
    balance_after: newBalance,
    reference_type: 'withdrawal_request',
    description: `سحب ${amount} MRU | عمولة: ${feeInfo.fee} MRU | صافي: ${feeInfo.netAmount} MRU | الوسيلة: ${paymentMethod || 'بنكيلي'} | ${accountDetails || ''} — ${notes || ''}`,
    status: 'completed',
  }, userId);

  // Record withdrawal fee as company revenue (same as deposit fees)
  if (feeInfo.fee > 0) {
    const today = new Date().toISOString().split('T')[0];
    await insertRecord('revenues', {
      amount: feeInfo.fee,
      title: `عمولة سحب ${amount} MRU`,
      type: 'عمولة',
      currency: 'MRU',
      description: `عمولة ${feeInfo.feePercent * 100}% على سحب ${amount} MRU — المستخدم: #${userId} — الوسيلة: ${paymentMethod || 'بنكيلي'}`,
      category: 'عمولات',
      date: today,
      status: 'approved',
      created_by: userId || 1,
    }, userId);
  }

  return NextResponse.json({
    success: true,
    message: `تم سحب ${amount} MRU من محفظتك. العمولة: ${feeInfo.fee} MRU (${feeInfo.tier}). الصافي: ${feeInfo.netAmount} MRU.`,
    transaction: txn,
    new_balance: newBalance,
    fee: feeInfo.fee,
    net_amount: feeInfo.netAmount,
    fee_tier: feeInfo.tier,
  });
}
