import { NextResponse } from 'next/server';
import { getTable, updateRecord, insertRecord, transaction } from '@/lib/db';
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

    // Prevent self-approval
    if (topup.user_id === user.user_id) {
      return NextResponse.json({ error: 'لا يمكنك الموافقة على طلب الشحن الخاص بك' }, { status: 403 });
    }

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
      const feeInfo = calcDepositFee(Number(topup.amount));
      const creditedAmount = feeInfo.creditedAmount;

      const result = await transaction(async (q) => {
        // Atomic balance update — prevents race condition on concurrent approvals
        const updateRes = await q(
          `UPDATE "wallets" SET "balance" = "balance" + $1, "total_deposited" = COALESCE("total_deposited", 0) + $1, "updated_at" = NOW()
           WHERE "wallet_id" = $2 RETURNING *`,
          [creditedAmount, topup.wallet_id]
        );
        if (updateRes.length === 0) throw new Error('المحفظة غير موجودة');
        const wallet = updateRes[0];
        const newBalance = roundMRU(Number(wallet.balance));

        const feeNote = feeInfo.fee > 0
          ? ` | عمولة الإيداع: ${feeInfo.fee} MRU (${feeInfo.tier}) | صافي الشحن: ${creditedAmount} MRU`
          : ` | بدون عمولة | الشحن كاملاً: ${creditedAmount} MRU`;

        await q(
          `INSERT INTO "wallet_transactions" ("wallet_id","type","amount","balance_after","reference_type","reference_id","description","status","created_at")
           VALUES ($1,'deposit',$2,$3,'topup_request',$4,$5,'completed',NOW())`,
          [topup.wallet_id, creditedAmount, newBalance, topup.request_id,
           `شحن المحفظة via بنكيلي — المرسِل: ${topup.sender_name || ''} — رقم المعاملة: ${topup.bankily_txn_id || 'N/A'} — المبلغ الأصلي: ${topup.amount} MRU${feeNote}`]
        );

        if (feeInfo.fee > 0) {
          await q(
            `INSERT INTO "revenues" ("amount","title","type","currency","description","category","date","status","created_by","created_at")
             VALUES ($1,$2,'عمولة','MRU',$3,'عمولات',$4,'approved',$5,NOW())`,
            [feeInfo.fee, `عمولة إيداع ${topup.amount} MRU — ${topup.sender_name || ''}`,
             `عمولة ${feeInfo.feePercent * 100}% على إيداع ${topup.amount} MRU — المستخدم: #${topup.user_id}`,
             new Date().toISOString().split('T')[0], approvedBy]
          );
        }

        await q(
          `UPDATE "topup_requests" SET "status" = 'approved', "approved_by" = $1, "approved_at" = NOW(), "updated_at" = NOW() WHERE "request_id" = $2`,
          [approvedBy, topup.request_id]
        );

        return { newBalance };
      });

      const feeMsg = feeInfo.fee > 0
        ? ` (العمولة: ${feeInfo.fee} MRU، الصافي: ${creditedAmount} MRU)`
        : ` (بدون عمولة)`;

      return NextResponse.json({
        success: true,
        message: `تم شحن ${creditedAmount} MRU في المحفظة بنجاح${feeMsg}. الرصيد الجديد: ${result.newBalance} MRU`,
        new_balance: result.newBalance,
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
