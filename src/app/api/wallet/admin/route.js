import { NextResponse } from 'next/server';
import { getTable, updateRecord, insertRecord } from '@/lib/db';
import { calcDepositFee, roundMRU } from '@/lib/fees';
import { verifySession, requireRole } from '@/lib/serverAuth';

/**
 * GET /api/wallet/admin
 * Returns all top-up requests for shipping agent / FM review.
 */
export async function GET(request) {
  try {
    const { user, error } = await verifySession(request);
    if (error) return error;

    const roleErr = await requireRole(user, ['shipping_agent', 'fm', 'ceo', 'admin']);
    if (roleErr) return roleErr;

    const allTopups = await getTable('topup_requests');
    const pending = allTopups
      .filter(t => t.status === 'pending')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const all = allTopups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return NextResponse.json({ pending, all });
  } catch (err) {
    console.error('Wallet Admin GET Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}

/**
 * PUT /api/wallet/admin
 * Body: { request_id, action: 'approve' | 'reject', approved_by }
 */
export async function PUT(request) {
  try {
    const { user, error } = await verifySession(request);
    if (error) return error;

    const roleErr = await requireRole(user, ['shipping_agent', 'fm', 'ceo', 'admin']);
    if (roleErr) return roleErr;

    const body = await request.json();
    const { request_id, action } = body;

    if (!request_id || !action) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }

    const allTopups = await getTable('topup_requests');
    const topup = allTopups.find(t => t.request_id === Number(request_id));
    if (!topup) return NextResponse.json({ error: 'طلب غير موجود' }, { status: 404 });
    if (topup.status !== 'pending') return NextResponse.json({ error: 'تم معالجة هذا الطلب مسبقاً' }, { status: 400 });

    const approvedBy = user.user_id;

    if (action === 'reject') {
      await updateRecord('topup_requests', topup.request_id, {
        status: 'rejected',
        approved_by: approvedBy,
        approved_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      }, approvedBy);

      return NextResponse.json({ success: true, message: 'تم رفض طلب الشحن.' });
    }

    if (action === 'approve') {
      // Calculate deposit fee
      const feeInfo = calcDepositFee(Number(topup.amount));
      const creditedAmount = feeInfo.creditedAmount;

      const wallets = await getTable('wallets');
      const wallet = wallets.find(w => w.wallet_id === topup.wallet_id);
      if (!wallet) return NextResponse.json({ error: 'المحفظة غير موجودة' }, { status: 404 });

      const newBalance = roundMRU(Number(wallet.balance) + creditedAmount);

      await updateRecord('wallets', wallet.wallet_id, {
        balance: newBalance,
        total_deposited: roundMRU(Number(wallet.total_deposited || 0) + creditedAmount),
      }, approvedBy);

      // Record the deposit with fee info
      const feeNote = feeInfo.fee > 0
        ? ` | عمولة الإيداع: ${feeInfo.fee} MRU (${feeInfo.tier}) | صافي الشحن: ${creditedAmount} MRU`
        : ` | بدون عمولة | الشحن كاملاً: ${creditedAmount} MRU`;

      await insertRecord('wallet_transactions', {
        wallet_id: wallet.wallet_id,
        type: 'deposit',
        amount: creditedAmount,
        balance_after: newBalance,
        reference_type: 'topup_request',
        reference_id: topup.request_id,
        description: `شحن المحفظة via بنكيلي — المرسِل: ${topup.sender_name || ''} — رقم المعاملة: ${topup.bankily_txn_id || 'N/A'} — المبلغ الأصلي: ${topup.amount} MRU${feeNote}`,
        status: 'completed',
      }, approvedBy);

      // If there's a fee, record it as a company revenue
      if (feeInfo.fee > 0) {
        await insertRecord('revenues', {
          amount: feeInfo.fee,
          title: `عمولة إيداع ${topup.amount} MRU — ${topup.sender_name || ''}`,
          type: 'عمولة',
          currency: 'MRU',
          description: `عمولة ${feeInfo.feePercent * 100}% على إيداع ${topup.amount} MRU — المستخدم: #${topup.user_id}`,
          category: 'عمولات',
          date: new Date().toISOString().split('T')[0],
          status: 'approved',
          created_by: approvedBy,
        }, approvedBy);
      }

      await updateRecord('topup_requests', topup.request_id, {
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      }, approvedBy);

      const feeMsg = feeInfo.fee > 0
        ? ` (العمولة: ${feeInfo.fee} MRU، الصافي: ${creditedAmount} MRU)`
        : ` (بدون عمولة)`;

      return NextResponse.json({
        success: true,
        message: `تم شحن ${creditedAmount} MRU في المحفظة بنجاح${feeMsg}. الرصيد الجديد: ${newBalance} MRU`,
        new_balance: newBalance,
        fee: feeInfo.fee,
        credited_amount: creditedAmount,
      });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (err) {
    console.error('Wallet Admin PUT Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}
