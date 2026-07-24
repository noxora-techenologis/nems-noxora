import { NextResponse } from 'next/server';
import { getTable, query } from '@/lib/db';

export async function POST() {
  try {
    const [revenues, expenses, salaries] = await Promise.all([
      getTable('revenues'),
      getTable('expenses'),
      getTable('salaries'),
    ]);

    const totalRevenue = revenues.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalSalaries = salaries.reduce((sum, s) => sum + (Number(s.net_salary) || 0), 0);
    const totalAssets = totalRevenue;
    const totalLiabilities = totalExpenses + totalSalaries;
    const net = totalAssets - totalLiabilities;

    const existing = await getTable('company_valuation');
    const current = existing[0];

    const newTotalShares = current ? (Number(current.total_shares) || 1000) : 1000;
    const valuePerShare = newTotalShares > 0 ? net / newTotalShares : 0;

    if (current) {
      await query(
        `UPDATE "company_valuation"
         SET "total_assets" = $1, "total_liabilities" = $2, "net_valuation" = $3,
             "value_per_share" = $4, "updated_at" = NOW()
         WHERE "valuation_id" = $5`,
        [totalAssets, totalLiabilities, net, valuePerShare, current.valuation_id]
      );
    } else {
      await query(
        `INSERT INTO "company_valuation"
         ("total_assets", "total_liabilities", "net_valuation", "total_shares", "value_per_share", "notes")
         VALUES ($1, $2, $3, $4, $5, 'Auto-calculated from revenues/expenses')`,
        [totalAssets, totalLiabilities, net, newTotalShares, valuePerShare]
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        net_valuation: net,
        total_shares: newTotalShares,
        value_per_share: valuePerShare,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
