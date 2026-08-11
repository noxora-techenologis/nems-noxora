import { NextResponse } from 'next/server';
import { getTable, query } from '@/lib/db';
import { verifySession, requireRole } from '@/lib/serverAuth';

/**
 * POST /api/share-transactions/approve
 * Body: { transactionId, approved: boolean }
 * CEO/Admin approves or rejects a share transaction and recalculates ownership percentages.
 */
export async function POST(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const roleErr = await requireRole(user, ['ceo', 'admin']);
    if (roleErr) return roleErr;

    const body = await request.json();
    const { transactionId, approved } = body;

    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId مطلوب' }, { status: 400 });
    }

    const txns = await getTable('share_transactions');
    const txn = txns.find(t => t.transaction_id === Number(transactionId));
    if (!txn) {
      return NextResponse.json({ error: 'المعاملة غير موجودة' }, { status: 404 });
    }
    if (txn.status !== 'pending') {
      return NextResponse.json({ error: 'تم معالجة هذه المعاملة مسبقاً' }, { status: 400 });
    }

    if (!approved) {
      await query(
        `UPDATE "share_transactions" SET "status" = 'rejected', "approved_by" = $1, "approved_at" = NOW(), "updated_at" = NOW() WHERE "transaction_id" = $2`,
        [user.user_id, transactionId]
      );
      return NextResponse.json({ success: true, message: 'تم رفض المعاملة' });
    }

    // Approved — update share counts
    const fromShares = await getTable('shares');
    const fromRecord = fromShares.find(s => s.owner_id === txn.from_owner_id);
    if (!fromRecord || Number(fromRecord.total_shares) < Number(txn.shares_count)) {
      return NextResponse.json({ error: 'المالك المصدر لا يملك أسهم كافية' }, { status: 400 });
    }

    // Deduct from sender
    const newFromShares = Number(fromRecord.total_shares) - Number(txn.shares_count);
    await query(
      `UPDATE "shares" SET "total_shares" = $1, "updated_at" = NOW() WHERE "share_id" = $2`,
      [newFromShares, fromRecord.share_id]
    );

    // Add to receiver (if transfer/gift — not sell)
    if (txn.to_owner_id && txn.transaction_type !== 'sell') {
      const toRecord = fromShares.find(s => s.owner_id === txn.to_owner_id);
      if (toRecord) {
        const newToShares = Number(toRecord.total_shares) + Number(txn.shares_count);
        await query(
          `UPDATE "shares" SET "total_shares" = $1, "updated_at" = NOW() WHERE "share_id" = $2`,
          [newToShares, toRecord.share_id]
        );
      }
    }

    // Recalculate all ownership percentages
    const allShares = await getTable('shares');
    const totalShares = allShares.reduce((s, sh) => s + (Number(sh.total_shares) || 0), 0);

    for (const sh of allShares) {
      const pct = totalShares > 0 ? ((Number(sh.total_shares) || 0) / totalShares * 100) : 0;
      await query(
        `UPDATE "shares" SET "ownership_percentage" = $1, "updated_at" = NOW() WHERE "share_id" = $2`,
        [Math.round(pct * 100) / 100, sh.share_id]
      );
    }

    // Mark transaction as completed
    await query(
      `UPDATE "share_transactions" SET "status" = 'completed', "approved_by" = $1, "approved_at" = NOW(), "updated_at" = NOW() WHERE "transaction_id" = $2`,
      [user.user_id, transactionId]
    );

    return NextResponse.json({
      success: true,
      message: 'تم اعتماد المعاملة وتحديث هيكل الأسهم',
      total_shares: totalShares,
    });
  } catch (err) {
    console.error('Share Transaction Approve Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}
