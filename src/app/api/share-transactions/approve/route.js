import { NextResponse } from 'next/server';
import { getTable, query, transaction } from '@/lib/db';
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

    // Explicit false check — undefined should not be treated as rejection
    if (approved === false || approved === 'false') {
      await query(
        `UPDATE "share_transactions" SET "status" = 'rejected', "approved_by" = $1, "approved_at" = NOW(), "updated_at" = NOW() WHERE "transaction_id" = $2`,
        [user.user_id, transactionId]
      );
      return NextResponse.json({ success: true, message: 'تم رفض المعاملة' });
    }

    if (approved !== true && approved !== 'true') {
      return NextResponse.json({ error: 'approved مطلوب (true أو false)' }, { status: 400 });
    }

    // Use a single transaction for the entire approve flow to prevent TOCTOU race conditions
    const result = await transaction(async (q) => {
      // Lock the transaction row with SELECT ... FOR UPDATE to prevent concurrent approvals
      const txnRows = await q(
        `SELECT * FROM "share_transactions" WHERE "transaction_id" = $1 FOR UPDATE`,
        [transactionId]
      );
      const txn = txnRows[0];
      if (!txn) throw new Error('NOT_FOUND');
      if (txn.status !== 'pending') throw new Error('ALREADY_PROCESSED');

      // Deduct from sender
      const fromRows = await q(
        `SELECT * FROM "shares" WHERE "owner_id" = $1 FOR UPDATE`,
        [txn.from_owner_id]
      );
      const fromRecord = fromRows[0];
      if (!fromRecord || Number(fromRecord.total_shares) < Number(txn.shares_count)) {
        throw new Error('INSUFFICIENT_SHARES');
      }

      const newFromShares = Number(fromRecord.total_shares) - Number(txn.shares_count);
      await q(
        `UPDATE "shares" SET "total_shares" = $1, "updated_at" = NOW() WHERE "share_id" = $2`,
        [newFromShares, fromRecord.share_id]
      );

      // Add to receiver (if transfer/gift — not sell)
      if (txn.to_owner_id && txn.transaction_type !== 'sell') {
        const toRows = await q(
          `SELECT * FROM "shares" WHERE "owner_id" = $1 FOR UPDATE`,
          [txn.to_owner_id]
        );
        const toRecord = toRows[0];
        if (!toRecord) throw new Error('RECEIVER_NOT_FOUND');
        const newToShares = Number(toRecord.total_shares) + Number(txn.shares_count);
        await q(
          `UPDATE "shares" SET "total_shares" = $1, "updated_at" = NOW() WHERE "share_id" = $2`,
          [newToShares, toRecord.share_id]
        );
      }

      // Recalculate all ownership percentages
      const allShares = await q(`SELECT * FROM "shares" FOR UPDATE`);
      const totalShares = allShares.reduce((s, sh) => s + (Number(sh.total_shares) || 0), 0);

      for (const sh of allShares) {
        const pct = totalShares > 0 ? ((Number(sh.total_shares) || 0) / totalShares * 100) : 0;
        await q(
          `UPDATE "shares" SET "ownership_percentage" = $1, "updated_at" = NOW() WHERE "share_id" = $2`,
          [Math.round(pct * 100) / 100, sh.share_id]
        );
      }

      // Mark transaction as completed
      await q(
        `UPDATE "share_transactions" SET "status" = 'completed', "approved_by" = $1, "approved_at" = NOW(), "updated_at" = NOW() WHERE "transaction_id" = $2`,
        [user.user_id, transactionId]
      );

      return { totalShares };
    });

    return NextResponse.json({
      success: true,
      message: 'تم اعتماد المعاملة وتحديث هيكل الأسهم',
      total_shares: result.totalShares,
    });
  } catch (err) {
    if (err.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'المعاملة غير موجودة' }, { status: 404 });
    }
    if (err.message === 'ALREADY_PROCESSED') {
      return NextResponse.json({ error: 'تم معالجة هذه المعاملة مسبقاً' }, { status: 400 });
    }
    if (err.message === 'INSUFFICIENT_SHARES') {
      return NextResponse.json({ error: 'المالك المصدر لا يملك أسهم كافية' }, { status: 400 });
    }
    if (err.message === 'RECEIVER_NOT_FOUND') {
      return NextResponse.json({ error: 'المالك المستقبل غير موجود في سجل الأسهم' }, { status: 400 });
    }
    console.error('Share Transaction Approve Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}
