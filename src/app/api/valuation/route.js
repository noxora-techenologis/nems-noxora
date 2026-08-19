import { NextResponse } from 'next/server';
import { getTable, query, transaction } from '@/lib/db';
import { roundMRU } from '@/lib/fees';
import { verifySession, requireRole } from '@/lib/serverAuth';

// GET: Return current valuation state
export async function GET(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;
    const [valuationRows, revenues, expenses, salaries, shares] = await Promise.all([
      getTable('company_valuation'),
      getTable('revenues'),
      getTable('expenses'),
      getTable('salaries'),
      getTable('shares'),
    ]);

    const v = valuationRows[0];
    if (!v || !v.valuation_id) {
      return NextResponse.json({ error: 'لا توجد سجلات تقييم للشركة.' }, { status: 404 });
    }
    const capital = Number(v.capital) || 0;
    const retainedEarnings = Number(v.retained_earnings) || 0;
    const distributedProfit = Number(v.distributed_profit) || 0;

    const totalRevenue = revenues.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    // Only count UNPAID salaries — paid salaries are already in expenses table
    const unpaidSalaries = salaries.filter(s => s.status !== 'paid');
    const totalUnpaidSalaries = unpaidSalaries.reduce((s, s2) => s + (Number(s2.net_salary) || 0), 0);
    const netProfit = totalRevenue - totalExpenses - totalUnpaidSalaries;

    const totalShares = shares.reduce((s, sh) => s + (Number(sh.total_shares) || 0), 0);
    const companyValue = capital + retainedEarnings;
    const shareValue = totalShares > 0 ? companyValue / totalShares : 0;

    // Undistributed profit (not yet split 30/70)
    const undistributed = Math.max(0, netProfit - distributedProfit - retainedEarnings);
    const pendingToOwners = undistributed * 0.30;
    const pendingToCompany = undistributed * 0.70;

    return NextResponse.json({
      capital,
      retained_earnings: retainedEarnings,
      distributed_profit: distributedProfit,
      net_profit: netProfit,
      company_value: companyValue,
      total_shares: totalShares,
      share_value: shareValue,
      undistributed,
      pending_to_owners_30: pendingToOwners,
      pending_to_company_70: pendingToCompany,
    });
  } catch (err) {
    console.error('Valuation GET Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}

// POST: Distribute profits (30% to owners, 70% retained)
export async function POST(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;
    const roleErr = await requireRole(user, ['ceo', 'admin']);
    if (roleErr) return roleErr;
    const [valuationRows, revenues, expenses, salaries, shares, existingDists] = await Promise.all([
      getTable('company_valuation'),
      getTable('revenues'),
      getTable('expenses'),
      getTable('salaries'),
      getTable('shares'),
      getTable('profit_distributions'),
    ]);

    const v = valuationRows[0];
    if (!v || !v.valuation_id) {
      return NextResponse.json({ error: 'لا توجد سجلات تقييم للشركة. يرجى إنشاء سجل تقييم أولاً.' }, { status: 404 });
    }
    const valuationId = v.valuation_id;
    const capital = Number(v.capital) || 0;
    const retainedEarnings = Number(v.retained_earnings) || 0;
    const distributedProfit = Number(v.distributed_profit) || 0;

    const totalRevenue = revenues.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    // Only count UNPAID salaries — paid salaries are already in expenses table
    const unpaidSalaries = salaries.filter(s => s.status !== 'paid');
    const totalUnpaidSalaries = unpaidSalaries.reduce((s, s2) => s + (Number(s2.net_salary) || 0), 0);
    const netProfit = totalRevenue - totalExpenses - totalUnpaidSalaries;

    const undistributed = netProfit - distributedProfit - retainedEarnings;
    if (undistributed <= 0) {
      return NextResponse.json({ error: 'لا توجد أرباح جديدة للتوزيع', net_profit: netProfit, distributed: distributedProfit });
    }

    // Idempotency check — use stable YYYY-MM format instead of locale-dependent string
    const currentMonth = new Date().toISOString().substring(0, 7);
    const pendingDists = existingDists.filter(d => d.period === currentMonth && d.payment_status === 'pending');
    if (pendingDists.length > 0) {
      return NextResponse.json({ error: 'تم توزيع الأرباح بالفعل لهذا الشهر. لا يمكن التكرار.' }, { status: 400 });
    }

    // Fix rounding drift: compute toOwners first, then toCompany = undistributed - toOwners
    const toOwners = roundMRU(undistributed * 0.30);
    const toCompany = undistributed - toOwners;
    const totalShares = shares.reduce((s, sh) => s + (Number(sh.total_shares) || 0), 0);

    // Wrap all inserts + valuation update in a single transaction
    await transaction(async (q) => {
      const now = new Date().toISOString();

      for (const sh of shares) {
        const ownerPercentage = Number(sh.ownership_percentage) || 0;
        const ownerAmount = totalShares > 0 ? roundMRU(toOwners * (Number(sh.total_shares) || 0) / totalShares) : 0;

        await q(
          `INSERT INTO "profit_distributions"
           ("owner_id", "period", "amount", "total_amount", "currency", "owner_percentage", "status", "payment_status", "created_at", "updated_at")
           VALUES ($1, $2, $3, $4, 'MRU', $5, 'approved', 'pending', $6, $6)`,
          [sh.owner_id, currentMonth, ownerAmount, toOwners, ownerPercentage, now]
        );
      }

      // Update valuation
      const newRetained = roundMRU(retainedEarnings + toCompany);
      const newDistributed = roundMRU(distributedProfit + toOwners);
      const newCompanyValue = capital + newRetained;

      await q(
        `UPDATE "company_valuation"
         SET "retained_earnings" = $1, "distributed_profit" = $2,
             "notes" = $3, "updated_at" = NOW()
         WHERE "valuation_id" = $4`,
        [newRetained, newDistributed,
         `رأس المال: ${capital} | أرباح محتفظ بها: ${newRetained} | أرباح موزعة: ${newDistributed} | إجمالي القيمة: ${newCompanyValue}`,
         valuationId]
      );

      return { newRetained, newDistributed, newCompanyValue };
    });

    const newRetained = roundMRU(retainedEarnings + toCompany);
    const newDistributed = roundMRU(distributedProfit + toOwners);
    const newCompanyValue = capital + newRetained;

    return NextResponse.json({
      success: true,
      data: {
        distributed_to_owners: toOwners,
        retained_by_company: toCompany,
        new_company_value: newCompanyValue,
        new_share_value: totalShares > 0 ? newCompanyValue / totalShares : 0,
      },
    });
  } catch (err) {
    console.error('Valuation POST Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}
