import { NextResponse } from 'next/server';
import { getTable, query } from '@/lib/db';

export async function POST() {
  try {
    const [revenues, expenses, salaries, valuationRows] = await Promise.all([
      getTable('revenues'),
      getTable('expenses'),
      getTable('salaries'),
      getTable('company_valuation'),
    ]);

    const current = valuationRows[0];
    const capital = current ? (Number(current.capital) || 25000) : 25000;

    const totalRevenue = revenues.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalSalaries = salaries.reduce((sum, s) => sum + (Number(s.net_salary) || 0), 0);

    const netProfit = totalRevenue - totalExpenses - totalSalaries;
    const netValuation = capital + netProfit;

    const existing = await getTable('company_valuation');
    const cur = existing[0];
    const newTotalShares = cur ? (Number(cur.total_shares) || 1000) : 1000;
    const valuePerShare = newTotalShares > 0 ? netValuation / newTotalShares : 0;

    if (cur) {
      await query(
        `UPDATE "company_valuation"
         SET "total_assets" = $1, "total_liabilities" = $2, "notes" = $3,
             "updated_at" = NOW()
         WHERE "valuation_id" = $4`,
        [totalRevenue, totalExpenses + totalSalaries,
         `رأس المال: ${capital} | إيرادات: ${totalRevenue} | مصروفات: ${totalExpenses} | رواتب: ${totalSalaries} | أرباح صافية: ${netProfit}`,
         cur.valuation_id]
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        capital,
        net_profit: netProfit,
        net_valuation: netValuation,
        total_shares: newTotalShares,
        value_per_share: valuePerShare,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
