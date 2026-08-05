import { NextResponse } from 'next/server';
import { getTable, updateRecord, insertRecord } from '@/lib/db';
import { roundMRU } from '@/lib/fees';
import { verifySession, requireRole } from '@/lib/serverAuth';

/**
 * POST /api/projects/close
 * Body: { projectId, profitAmount }
 * Only CEO/Admin/FM can close projects.
 */
export async function POST(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const roleErr = await requireRole(user, ['ceo', 'admin', 'fm']);
    if (roleErr) return roleErr;

    const body = await request.json();
    const { projectId, profitAmount } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId مطلوب' }, { status: 400 });
    }

    const projects = await getTable('projects');
    const project = projects.find(p => p.project_id === Number(projectId));
    if (!project) return NextResponse.json({ error: 'المشروع غير موجود' }, { status: 404 });

    if (project.status === 'completed' || project.status === 'closed') {
      return NextResponse.json({ error: 'المشروع مغلق بالفعل' }, { status: 400 });
    }

    const profit = Number(profitAmount) || 0;
    if (profit < 0) {
      return NextResponse.json({ error: 'الأرباح لا يمكن أن تكون سالبة' }, { status: 400 });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const today = new Date().toISOString().split('T')[0];

    // 1. Close the project
    await updateRecord('projects', Number(projectId), {
      status: 'completed',
      profit_amount: profit,
      closed_at: now,
    }, user.user_id);

    // 2. 50% to company — update company_valuation retained_earnings
    const companyShare = profit * 0.5;
    if (companyShare > 0) {
      const valuations = await getTable('company_valuation');
      if (valuations.length > 0) {
        const val = valuations[0];
        const currentRetained = Number(val.retained_earnings) || 0;
        await updateRecord('company_valuation', val.valuation_id, {
          retained_earnings: roundMRU(currentRetained + companyShare),
          updated_at: now,
        }, user.user_id);
      }

      // Also log as revenue for the company
      await insertRecord('revenues', {
        amount: companyShare,
        title: `حصة الشركة من أرباح مشروع: ${project.name} (50%)`,
        type: 'استثمار',
        currency: 'MRU',
        description: `50% من أرباح المشروع البالغة ${profit} MRU`,
        category: 'استثمار',
        date: today,
        status: 'approved',
        created_by: user.user_id,
      }, user.user_id);
    }

    // 3. 50% to investors — proportional to investment
    const investorShare = profit * 0.5;
    const allInvestments = await getTable('project_investments');
    const projectInvestments = allInvestments.filter(
      i => i.project_id === Number(projectId) && i.status === 'active'
    );

    let totalDistributed = 0;
    const distributionResults = [];

    for (const inv of projectInvestments) {
      const totalInvestedInProject = Number(project.total_invested) || 1;
      const investmentSharePct = Number(inv.amount) / totalInvestedInProject;
      const investorProfit = investorShare * investmentSharePct;

      if (investmentSharePct <= 0 || investorProfit <= 0) continue;

      totalDistributed += investorProfit;

      // Update investment ROI
      await updateRecord('project_investments', inv.investment_id, {
        roi_earned: Number(inv.roi_earned || 0) + investorProfit,
        status: 'paid_out',
      }, user.user_id);

      // Credit wallet
      const wallets = await getTable('wallets');
      const wallet = wallets.find(w => w.wallet_id === inv.wallet_id);
      if (!wallet) continue;

      const newBalance = roundMRU(Number(wallet.balance) + investorProfit);
      await updateRecord('wallets', wallet.wallet_id, {
        balance: newBalance,
        total_earned: roundMRU(Number(wallet.total_earned || 0) + investorProfit),
      }, user.user_id);

      // Wallet transaction
      await insertRecord('wallet_transactions', {
        wallet_id: wallet.wallet_id,
        type: 'roi',
        amount: investorProfit,
        balance_after: newBalance,
        reference_type: 'project_roi',
        reference_id: Number(projectId),
        description: `عائد استثمار من مشروع: ${project.name} — ${(investmentSharePct * 100).toFixed(2)}% من الأرباح`,
        status: 'completed',
      }, user.user_id);

      distributionResults.push({
        user_id: inv.user_id,
        investment_amount: inv.amount,
        share_pct: (investmentSharePct * 100).toFixed(2),
        profit_earned: investorProfit,
      });
    }

    return NextResponse.json({
      success: true,
      message: `تم إغلاق المشروع وتوزيع الأرباح. حصة الشركة: ${companyShare} MRU | حصة المستثمرين: ${totalDistributed} MRU`,
      project_id: Number(projectId),
      total_profit: profit,
      company_share: companyShare,
      investor_share: totalDistributed,
      distributions: distributionResults,
    });
  } catch (err) {
    console.error('Project Close Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}
