import { NextResponse } from 'next/server';
import { getTable, query, transaction } from '@/lib/db';
import { verifySession } from '@/lib/serverAuth';

/**
 * POST /api/votes/cast
 * Body: { vote_id, option_id }
 * Records the vote and recalculates ALL weighted percentages atomically.
 */
export async function POST(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const body = await request.json();
    const { vote_id, option_id } = body;

    if (!vote_id || !option_id) {
      return NextResponse.json({ error: 'vote_id و option_id مطلوبين' }, { status: 400 });
    }

    const result = await transaction(async (q) => {
      // 1. Check vote exists and is active
      const votes = await q(`SELECT * FROM "votes" WHERE "vote_id" = $1 FOR UPDATE`, [vote_id]);
      const vote = votes[0];
      if (!vote) throw new Error('VOTE_NOT_FOUND');
      if (vote.status !== 'active') throw new Error('VOTE_CLOSED');

      // 2. Check end_date hasn't passed
      if (vote.end_date && new Date(vote.end_date) < new Date()) {
        throw new Error('VOTE_EXPIRED');
      }

      // 3. Check if user already voted
      const existingVotes = await q(
        `SELECT * FROM "user_votes" WHERE "vote_id" = $1 AND "user_id" = $2`,
        [vote_id, user.user_id]
      );
      if (existingVotes.length > 0) throw new Error('ALREADY_VOTED');

      // 4. Get the user's share weight
      const owners = await q(`SELECT * FROM "owners" WHERE "user_id" = $1`, [user.user_id]);
      const owner = owners[0];
      let sharesWeight = 100;
      if (owner) {
        const shares = await q(`SELECT * FROM "shares" WHERE "owner_id" = $1`, [owner.owner_id]);
        if (shares[0]) sharesWeight = Number(shares[0].total_shares) || 100;
      }

      // 5. Record the vote
      await q(
        `INSERT INTO "user_votes" ("vote_id", "option_id", "user_id", "shares_weight", "created_at", "updated_at")
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [vote_id, option_id, user.user_id, sharesWeight]
      );

      // 6. Recalculate ALL weighted percentages for this vote from scratch (atomic)
      const allUserVotes = await q(
        `SELECT * FROM "user_votes" WHERE "vote_id" = $1`,
        [vote_id]
      );

      // Sum total weight across all votes cast
      const totalWeight = allUserVotes.reduce((s, uv) => s + (Number(uv.shares_weight) || 100), 0);

      // Get all options for this vote
      const allOptions = await q(
        `SELECT * FROM "vote_options" WHERE "vote_id" = $1`,
        [vote_id]
      );

      for (const opt of allOptions) {
        // Sum weights for this option
        const optVotes = allUserVotes.filter(uv => uv.option_id === opt.option_id);
        const optWeight = optVotes.reduce((s, uv) => s + (Number(uv.shares_weight) || 100), 0);
        const weightedPct = totalWeight > 0 ? Math.round((optWeight / totalWeight) * 10000) / 100 : 0;

        await q(
          `UPDATE "vote_options" SET "votes_count" = $1, "weighted_percentage" = $2, "updated_at" = NOW()
           WHERE "option_id" = $3`,
          [optVotes.length, Math.min(100, weightedPct), opt.option_id]
        );
      }

      return { sharesWeight, totalWeight };
    });

    return NextResponse.json({
      success: true,
      message: 'تم تسجيل صوتك بنجاح',
      shares_weight: result.sharesWeight,
    });
  } catch (err) {
    if (err.message === 'VOTE_NOT_FOUND') {
      return NextResponse.json({ error: 'القرار غير موجود' }, { status: 404 });
    }
    if (err.message === 'VOTE_CLOSED') {
      return NextResponse.json({ error: 'هذا القرار مغلق' }, { status: 400 });
    }
    if (err.message === 'VOTE_EXPIRED') {
      return NextResponse.json({ error: 'انتهت مهلة التصويت' }, { status: 400 });
    }
    if (err.message === 'ALREADY_VOTED') {
      return NextResponse.json({ error: 'لقد قمت بالتصويت على هذا القرار مسبقاً' }, { status: 400 });
    }
    console.error('Vote Cast Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}
