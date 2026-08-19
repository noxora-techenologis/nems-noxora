import { NextResponse } from 'next/server';
import { getTable, insertRecord, query, transaction } from '@/lib/db';
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

  // Find existing wallet — do NOT accept owner_id/employee_id from request body
  const wallets = await getTable('wallets');
  let wallet = wallets.find(w => w.user_id === userId);

  if (!wallet) {
    // Create wallet with only user_id — owner_id/employee_id resolved from DB
    const employees = await getTable('employees');
    const owners = await getTable('owners');
    const emp = employees.find(e => e.user_id === userId);
    const owner = owners.find(o => o.user_id === userId);

    wallet = await insertRecord('wallets', {
      user_id: userId,
      owner_id: owner?.owner_id || null,
      employee_id: emp?.employee_id || null,
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

  const feeInfo = calcWithdrawalFee(amount);

  const result = await transaction(async (q) => {
    // Atomic balance check + deduction + total_withdrawn update
    const deductResult = await q(
      `UPDATE "wallets" SET "balance" = "balance" - $1, "total_withdrawn" = COALESCE("total_withdrawn", 0) + $1, "updated_at" = NOW()
       WHERE "wallet_id" = $2 AND "balance" >= $1 RETURNING *`,
      [amount, wallet.wallet_id]
    );
    if (deductResult.length === 0) throw new Error('INSUFFICIENT_BALANCE');
    const newBalance = roundMRU(Number(deductResult[0].balance));

    await q(
      `INSERT INTO "wallet_transactions" ("wallet_id","type","amount","balance_after","reference_type","description","status","created_at")
       VALUES ($1,'withdrawal',$2,$3,'withdrawal_request',$4,'completed',NOW())`,
      [wallet.wallet_id, amount, newBalance,
       `سحب ${amount} MRU | عمولة: ${feeInfo.fee} MRU | صافي: ${feeInfo.netAmount} MRU | الوسيلة: ${paymentMethod || 'بنكيلي'} | ${accountDetails || ''} — ${notes || ''}`]
    );

    if (feeInfo.fee > 0) {
      await q(
        `INSERT INTO "revenues" ("amount","title","type","currency","description","category","date","status","created_by","created_at")
         VALUES ($1,$2,'عمولة','MRU',$3,'عمولات',$4,'approved',$5,NOW())`,
        [feeInfo.fee, `عمولة سحب ${amount} MRU`,
         `عمولة ${feeInfo.feePercent * 100}% على سحب ${amount} MRU — المستخدم: #${userId} — الوسيلة: ${paymentMethod || 'بنكيلي'}`,
         new Date().toISOString().split('T')[0], userId || 1]
      );
    }

    return { newBalance };
  });

  return NextResponse.json({
    success: true,
    message: `تم سحب ${amount} MRU من محفظتك. العمولة: ${feeInfo.fee} MRU (${feeInfo.tier}). الصافي: ${feeInfo.netAmount} MRU.`,
    new_balance: result.newBalance,
    fee: feeInfo.fee,
    net_amount: feeInfo.netAmount,
    fee_tier: feeInfo.tier,
  });
}
