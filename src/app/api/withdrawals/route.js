import { NextResponse } from 'next/server';
import { getTable, query } from '@/lib/db';
import { verifySession } from '@/lib/serverAuth';

const VALID_STATUSES = ['PENDING', 'FINANCIALLY_VERIFIED', 'APPROVED', 'COMPLETED'];

// GET: List withdrawal requests (filtered by role)
export async function GET(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('ownerId');
    const role = searchParams.get('role') || '';

    let data = await getTable('withdrawal_requests');

    // Owner can only see their own requests
    if (role === 'owner' && ownerId) {
      data = data.filter(r => r.owner_id === Number(ownerId));
    }

    // Sort by newest first
    data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return NextResponse.json({ data, total: data.length });
  } catch (err) {
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}

// POST: Create new withdrawal request (Owner only)
export async function POST(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const body = await request.json();
    const { amount, payment_method, notes } = body;

    const owners = await getTable('owners');
    const ownerRecord = owners.find(o => o.user_id === user.user_id);
    if (!ownerRecord) {
      return NextResponse.json({ error: 'لا يوجد سجل مالك لهذا المستخدم' }, { status: 400 });
    }
    const owner_id = ownerRecord.owner_id;

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 });
    }

    // Server-side: Validate owner has enough balance
    const [profitDists, existingWithdrawals] = await Promise.all([
      getTable('profit_distributions'),
      getTable('withdrawal_requests'),
    ]);

    const ownerDists = profitDists.filter(d => d.owner_id === Number(owner_id) && (d.payment_status === 'pending' || d.payment_status === 'paid'));
    const totalDistributed = ownerDists.reduce((s, d) => s + (Number(d.amount) || 0), 0);

    const totalWithdrawn = existingWithdrawals
      .filter(w => w.owner_id === Number(owner_id) && ['PENDING', 'FINANCIALLY_VERIFIED', 'APPROVED', 'COMPLETED'].includes(w.status))
      .reduce((s, w) => s + (Number(w.amount) || 0), 0);

    const availableBalance = totalDistributed - totalWithdrawn;

    if (Number(amount) > availableBalance) {
      return NextResponse.json({
        error: `الرصيد غير كافٍ. الرصيد المتاح: ${availableBalance} MRU`
      }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO "withdrawal_requests"
       ("owner_id", "amount", "status", "payment_method", "notes", "created_by", "created_at", "updated_at")
       VALUES ($1, $2, 'PENDING', $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [owner_id, Number(amount), payment_method || 'تحويل بنكي', notes || '', user.user_id]
    );

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}

// PUT: Update status (role-based)
export async function PUT(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const body = await request.json();
    const { _id, status, payment_method, notes } = body;

    if (!_id || !status) {
      return NextResponse.json({ error: 'بيانات مطلوبة مفقودة' }, { status: 400 });
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'حالة غير صحيحة' }, { status: 400 });
    }

    // Get current request
    const existing = await getTable('withdrawal_requests');
    const req = existing.find(r => r.request_id === Number(_id));
    if (!req) {
      return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
    }

    const roleLower = (user.role_name || '').toLowerCase();
    const user_id = user.user_id;

    // Permission checks per state transition
    if (status === 'FINANCIALLY_VERIFIED') {
      if (!['fm', 'admin'].includes(roleLower)) {
        return NextResponse.json({ error: 'فقط المدير المالي يمكنه التدقيق المالي' }, { status: 403 });
      }
      if (req.status !== 'PENDING') {
        return NextResponse.json({ error: 'الطلب يجب أن يكون في حالة PENDING أولاً' }, { status: 400 });
      }
    }

    if (status === 'APPROVED') {
      if (!['ceo', 'admin'].includes(roleLower)) {
        return NextResponse.json({ error: 'فقط المدير العام يمكنه الاعتماد النهائي' }, { status: 403 });
      }
      if (req.status !== 'FINANCIALLY_VERIFIED') {
        return NextResponse.json({ error: 'الطلب يجب أن يكون مدققاً مالياً أولاً' }, { status: 400 });
      }
    }

    if (status === 'COMPLETED') {
      if (!['fm', 'admin'].includes(roleLower)) {
        return NextResponse.json({ error: 'فقط المدير المالي يمكنه تأكيد التحويل' }, { status: 403 });
      }
      if (req.status !== 'APPROVED') {
        return NextResponse.json({ error: 'الطلب يجب أن يكون معتمداً أولاً' }, { status: 400 });
      }
    }

    // Build update query
    const updates = [`"status" = $1`, `"updated_at" = NOW()`];
    const values = [status];
    let paramIdx = 2;

    if (status === 'FINANCIALLY_VERIFIED') {
      updates.push(`"verified_by" = $${paramIdx++}`);
      updates.push(`"verified_at" = NOW()`);
      values.push(user_id);
    } else if (status === 'APPROVED') {
      updates.push(`"approved_by" = $${paramIdx++}`);
      updates.push(`"approved_at" = NOW()`);
      values.push(user_id);
    } else if (status === 'COMPLETED') {
      updates.push(`"completed_by" = $${paramIdx++}`);
      updates.push(`"completed_at" = NOW()`);
      updates.push(`"payment_method" = $${paramIdx++}`);
      values.push(user_id);
      values.push(payment_method || req.payment_method || 'تحويل بنكي');
    }

    if (notes !== undefined) {
      updates.push(`"notes" = $${paramIdx++}`);
      values.push(notes);
    }

    values.push(Number(_id));

    const result = await query(
      `UPDATE "withdrawal_requests" SET ${updates.join(', ')} WHERE "request_id" = $${paramIdx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'فشل التحديث' }, { status: 500 });
    }

    // If COMPLETED, mark profit_distributions as paid for this owner
    if (status === 'COMPLETED') {
      const ownerDists = (await getTable('profit_distributions'))
        .filter(d => d.owner_id === req.owner_id && d.payment_status === 'pending');

      let remaining = Number(req.amount);
      for (const dist of ownerDists) {
        if (remaining <= 0) break;
        const distAmount = Number(dist.amount);
        if (distAmount <= remaining) {
          await query(`UPDATE "profit_distributions" SET "payment_status" = 'paid', "updated_at" = NOW() WHERE "distribution_id" = $1`, [dist.distribution_id]);
          remaining -= distAmount;
        } else {
          await query(`UPDATE "profit_distributions" SET "amount" = $1, "payment_status" = 'paid', "updated_at" = NOW() WHERE "distribution_id" = $2`, [distAmount - remaining, dist.distribution_id]);
          remaining = 0;
        }
      }
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (err) {
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}

// DELETE: Cancel request (Owner can cancel PENDING, CEO can cancel any)
export async function DELETE(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const body = await request.json();
    const { _id } = body;

    const existing = await getTable('withdrawal_requests');
    const req = existing.find(r => r.request_id === Number(_id));
    if (!req) {
      return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
    }

    const roleLower = (user.role_name || '').toLowerCase();

    if (roleLower === 'owner' && req.status !== 'PENDING') {
      return NextResponse.json({ error: 'المالك لا يمكنه إلغاء طلب بعد المراجعة' }, { status: 403 });
    }

    if (!['ceo', 'admin', 'owner'].includes(roleLower)) {
      return NextResponse.json({ error: 'غير مصرح بالحذف' }, { status: 403 });
    }

    // If COMPLETED withdrawal is deleted, rollback profit_distributions
    if (req.status === 'COMPLETED') {
      const ownerDists = (await getTable('profit_distributions'))
        .filter(d => d.owner_id === req.owner_id && d.payment_status === 'paid')
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      let remaining = Number(req.amount);
      for (const dist of ownerDists) {
        if (remaining <= 0) break;
        const distAmount = Number(dist.amount);
        if (distAmount <= remaining) {
          await query(`UPDATE "profit_distributions" SET "payment_status" = 'pending', "updated_at" = NOW() WHERE "distribution_id" = $1`, [dist.distribution_id]);
          remaining -= distAmount;
        } else {
          await query(`UPDATE "profit_distributions" SET "amount" = $1, "payment_status" = 'pending', "updated_at" = NOW() WHERE "distribution_id" = $2`, [distAmount - remaining, dist.distribution_id]);
          remaining = 0;
        }
      }
    }

    await query(`DELETE FROM "withdrawal_requests" WHERE "request_id" = $1`, [_id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}
