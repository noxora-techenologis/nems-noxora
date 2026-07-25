import { NextResponse } from 'next/server';
import { getTable, updateRecord, insertRecord } from '@/lib/db';

/**
 * GET /api/wallet/admin
 * Returns all top-up requests for FM review.
 */
export async function GET() {
  try {
    const allTopups = await getTable('topup_requests');
    const pending = allTopups
      .filter(t => t.status === 'pending')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const all = allTopups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return NextResponse.json({ pending, all });
  } catch (err) {
    console.error('Wallet Admin GET Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/wallet/admin
 * Body: { request_id, action: 'approve' | 'reject', approved_by }
 */
export async function PUT(request) {
  try {
    const body = await request.json();
    const { request_id, action, approved_by } = body;

    if (!request_id || !action) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }

    const allTopups = await getTable('topup_requests');
    const topup = allTopups.find(t => t.request_id === Number(request_id));
    if (!topup) return NextResponse.json({ error: 'طلب غير موجود' }, { status: 404 });
    if (topup.status !== 'pending') return NextResponse.json({ error: 'تم معالجة هذا الطلب مسبقاً' }, { status: 400 });

    if (action === 'reject') {
      await updateRecord('topup_requests', topup.request_id, {
        status: 'rejected',
        approved_by: approved_by || null,
        approved_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      }, approved_by || 1);

      return NextResponse.json({ success: true, message: 'تم رفض طلب الشحن.' });
    }

    if (action === 'approve') {
      const wallets = await getTable('wallets');
      const wallet = wallets.find(w => w.wallet_id === topup.wallet_id);
      if (!wallet) return NextResponse.json({ error: 'المحفظة غير موجودة' }, { status: 404 });

      const newBalance = Number(wallet.balance) + Number(topup.amount);

      await updateRecord('wallets', wallet.wallet_id, {
        balance: newBalance,
        total_deposited: Number(wallet.total_deposited || 0) + Number(topup.amount),
      }, approved_by || 1);

      await insertRecord('wallet_transactions', {
        wallet_id: wallet.wallet_id,
        type: 'deposit',
        amount: Number(topup.amount),
        balance_after: newBalance,
        reference_type: 'topup_request',
        reference_id: topup.request_id,
        description: `شحن المحفظة via بنكيلي — ${topup.sender_name || ''} — رقم المعاملة: ${topup.bankily_txn_id || 'N/A'}`,
        status: 'completed',
      }, approved_by || 1);

      await updateRecord('topup_requests', topup.request_id, {
        status: 'approved',
        approved_by: approved_by || null,
        approved_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      }, approved_by || 1);

      return NextResponse.json({
        success: true,
        message: `تم شحن ${topup.amount} MRU في المحفظة بنجاح. الرصيد الجديد: ${newBalance} MRU`,
        new_balance: newBalance,
      });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (err) {
    console.error('Wallet Admin PUT Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
