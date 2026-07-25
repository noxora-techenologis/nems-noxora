import { NextResponse } from 'next/server';
import { getTable, insertRecord, updateRecord } from '@/lib/db';
import { verifySession } from '@/lib/serverAuth';

/**
 * GET /api/projects/proposals?projectId=X
 * Returns proposals + votes for a project.
 */
export async function GET(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) return NextResponse.json({ error: 'projectId مطلوب' }, { status: 400 });

    const allProposals = await getTable('project_proposals');
    const proposals = allProposals
      .filter(p => p.project_id === Number(projectId))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const allVotes = await getTable('project_votes');
    const users = await getTable('users');

    const enriched = proposals.map(prop => {
      const votes = allVotes.filter(v => v.proposal_id === prop.proposal_id);
      const approveVotes = votes.filter(v => v.choice === 'approve');
      const objectVotes = votes.filter(v => v.choice === 'object');

      const approveWeight = approveVotes.reduce((sum, v) => sum + (Number(v.weight) || 0), 0);
      const objectWeight = objectVotes.reduce((sum, v) => sum + (Number(v.weight) || 0), 0);
      const totalWeight = approveWeight + objectWeight;

      const voters = votes.map(v => {
        const user = users.find(u => u.user_id === v.user_id);
        return {
          ...v,
          user_name: user?.name || `مستخدم #${v.user_id}`,
        };
      });

      return {
        ...prop,
        votes: voters,
        approve_count: approveVotes.length,
        object_count: objectVotes.length,
        approve_weight: approveWeight,
        object_weight: objectWeight,
        total_weight: totalWeight,
        passed: totalWeight > 0 && approveWeight > objectWeight,
      };
    });

    return NextResponse.json({ proposals: enriched });
  } catch (err) {
    console.error('Proposals GET Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}

/**
 * POST /api/projects/proposals
 * Body: { action: 'create' | 'vote', projectId, userId, title?, description?, proposalId?, choice?, investmentId?, weight? }
 */
export async function POST(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const body = await request.json();
    const { action, projectId, userId, title, description, proposalId, choice, investmentId, weight } = body;

    if (action === 'create') {
      if (!projectId || !userId || !title) {
        return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
      }

      // Verify user is an investor in this project
      const investments = await getTable('project_investments');
      const isInvestor = investments.some(
        i => i.project_id === Number(projectId) && i.user_id === Number(userId) && i.status === 'active'
      );

      if (!isInvestor) {
        return NextResponse.json({ error: 'فقط المستثمرون يمكنهم تقديم مقترحات' }, { status: 403 });
      }

      const proposal = await insertRecord('project_proposals', {
        project_id: Number(projectId),
        user_id: Number(userId),
        title,
        description: description || null,
        status: 'active',
      }, Number(userId));

      return NextResponse.json({ success: true, proposal, message: 'تم نشر المقترح بنجاح.' });
    }

    if (action === 'vote') {
      if (!proposalId || !userId || !choice) {
        return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
      }

      if (!['approve', 'object'].includes(choice)) {
        return NextResponse.json({ error: 'الخيار يجب أن يكون approve أو object' }, { status: 400 });
      }

      // Get proposal
      const allProposals = await getTable('project_proposals');
      const proposal = allProposals.find(p => p.proposal_id === Number(proposalId));
      if (!proposal) return NextResponse.json({ error: 'المقترح غير موجود' }, { status: 404 });

      // Verify user is investor
      const investments = await getTable('project_investments');
      const userInvestment = investments.find(
        i => i.project_id === proposal.project_id && i.user_id === Number(userId) && i.status === 'active'
      );

      if (!userInvestment) {
        return NextResponse.json({ error: 'فقط المستثمرون يمكنهم التصويت' }, { status: 403 });
      }

      // Check if already voted
      const allVotes = await getTable('project_votes');
      const existingVote = allVotes.find(
        v => v.proposal_id === Number(proposalId) && v.user_id === Number(userId)
      );

      if (existingVote) {
        return NextResponse.json({ error: 'لتصويت مسبقاً على هذا المقترح' }, { status: 400 });
      }

      // Weight = investment percentage
      const voteWeight = Number(userInvestment.investment_percentage) || 0;

      const vote = await insertRecord('project_votes', {
        proposal_id: Number(proposalId),
        user_id: Number(userId),
        investment_id: userInvestment.investment_id,
        choice,
        weight: voteWeight,
      }, Number(userId));

      return NextResponse.json({
        success: true,
        vote,
        message: `تم تسجيل تصويتك (${choice === 'approve' ? 'موافق' : 'معترض'}) بوزن ${voteWeight.toFixed(2)}%`,
      });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (err) {
    console.error('Proposals POST Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}
