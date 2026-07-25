import { NextResponse } from 'next/server';
import { getTable, insertRecord, updateRecord, query } from '@/lib/db';
import { verifySession } from '@/lib/serverAuth';

/**
 * GET /api/projects/invest?projectId=X
 * Returns investors list for a project + total invested.
 */
export async function GET(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) return NextResponse.json({ error: 'projectId مطلوب' }, { status: 400 });

    const allInvestments = await getTable('project_investments');
    const investments = allInvestments
      .filter(i => i.project_id === Number(projectId))
      .sort((a, b) => new Date(b.invested_at) - new Date(a.invested_at));

    const totalInvested = investments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    // Fetch user names
    const users = await getTable('users');
    const enriched = investments.map(inv => {
      const user = users.find(u => u.user_id === inv.user_id);
      return { ...inv, user_name: user?.name || `مستخدم #${inv.user_id}` };
    });

    return NextResponse.json({ investments: enriched, total_invested: totalInvested });
  } catch (err) {
    console.error('Invest GET Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}

/**
 * POST /api/projects/invest
 * Body: { projectId, userId, amount, owner_id?, employee_id? }
 * Deducts from wallet, creates investment record, updates project total_invested.
 */
export async function POST(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const body = await request.json();
    const { projectId, userId, amount, owner_id, employee_id } = body;

    if (!projectId || !userId || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
    }

    // Get project
    const projects = await getTable('projects');
    const project = projects.find(p => p.project_id === Number(projectId));
    if (!project) return NextResponse.json({ error: 'المشروع غير موجود' }, { status: 404 });

    if (!project.is_investable) {
      return NextResponse.json({ error: 'هذا المشروع غير متاح للاستثمار' }, { status: 400 });
    }

    if (project.status === 'completed' || project.status === 'closed') {
      return NextResponse.json({ error: 'المشروع مغلق ولا يمكن الاستثمار فيه' }, { status: 400 });
    }

    const investAmount = Number(amount);
    if (project.min_investment && investAmount < Number(project.min_investment)) {
      return NextResponse.json({ error: `الحد الأدنى للاستثمار: ${project.min_investment} MRU` }, { status: 400 });
    }

    // Check wallet balance
    const wallets = await getTable('wallets');
    const wallet = wallets.find(w => w.user_id === Number(userId));
    if (!wallet) return NextResponse.json({ error: 'لا توجد محفظة لك. يرجى شحن المحفظة أولاً.' }, { status: 400 });
    if (Number(wallet.balance) < investAmount) {
      return NextResponse.json({ error: `رصيد المحفظة غير كافٍ. المتاح: ${wallet.balance} MRU` }, { status: 400 });
    }

    // Deduct from wallet
    const newBalance = Number(wallet.balance) - investAmount;
    await updateRecord('wallets', wallet.wallet_id, {
      balance: newBalance,
      total_invested: Number(wallet.total_invested || 0) + investAmount,
    }, Number(userId));

    // Create wallet transaction
    await insertRecord('wallet_transactions', {
      wallet_id: wallet.wallet_id,
      type: 'investment',
      amount: investAmount,
      balance_after: newBalance,
      reference_type: 'project_investment',
      reference_id: Number(projectId),
      description: `استثمار في مشروع: ${project.name}`,
      status: 'completed',
    }, Number(userId));

    // Create investment record
    const newTotalInvested = Number(project.total_invested || 0) + investAmount;
    const investPercentage = project.budget_target > 0
      ? ((investAmount / Number(project.budget_target)) * 100)
      : 0;

    const investment = await insertRecord('project_investments', {
      project_id: Number(projectId),
      wallet_id: wallet.wallet_id,
      user_id: Number(userId),
      owner_id: owner_id || null,
      employee_id: employee_id || null,
      amount: investAmount,
      investment_percentage: investPercentage,
      roi_earned: 0,
      status: 'active',
    }, Number(userId));

    // Update project total_invested
    await updateRecord('projects', Number(projectId), {
      total_invested: newTotalInvested,
    }, Number(userId));

    return NextResponse.json({
      success: true,
      message: `تم استثمار ${investAmount} MRU في مشروع "${project.name}" بنجاح.`,
      investment,
      new_wallet_balance: newBalance,
      project_total_invested: newTotalInvested,
    });
  } catch (err) {
    console.error('Invest POST Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}
