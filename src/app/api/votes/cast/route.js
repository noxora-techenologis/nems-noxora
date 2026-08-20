import { NextResponse } from 'next/server';
import { getTable, query, transaction } from '@/lib/db';
import { verifySession } from '@/lib/serverAuth';

export async function POST(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const body = await request.json();
    const { vote_id, option_id } = body;

    if (!vote_id || !option_id) {
      return NextResponse.json({ error: 'vote_id و option_id مطلوبان' }, { status: 400 });
    }

    // Check if already voted
    const existingVotes = await getTable('user_votes');
    const alreadyVoted = existingVotes.some(uv => uv.vote_id === Number(vote_id) && uv.user_id === user.user_id);
    if (alreadyVoted) {
      return NextResponse.json({ error: 'لقد قمت بالتصويت على هذا القرار مسبقاً' }, { status: 400 });
    }

    // Check vote is active
    const votes = await getTable('votes');
    const vote = votes.find(v => v.vote_id === Number(vote_id));
    if (!vote) {
      return NextResponse.json({ error: 'القرار غير موجود' }, { status: 404 });
    }
    if (vote.status !== 'active') {
      return NextResponse.json({ error: 'هذا القرار مغلق ولا يمكن التصويت عليه' }, { status: 400 });
    }

    // Get owner shares weight
    const owners = await getTable('owners');
    const shares = await getTable('shares');
    const ownerRecord = owners.find(o => o.user_id === user.user_id);
    if (!ownerRecord) {
      return NextResponse.json({ error: 'لم يُعثر على سجل ملكيتك' }, { status: 400 });
    }
    const myShares = shares.find(s => s.owner_id === ownerRecord.owner_id);
    const sharesWeight = myShares ? Number(myShares.total_shares) : 100;
    const totalShares = shares.reduce((s, sh) => s + (Number(sh.total_shares) || 0), 0);

    // Record vote + recalculate percentages atomically
    await transaction(async (q) => {
      // 1. Record user vote
      await q(
        `INSERT INTO "user_votes" ("vote_id", "option_id", "user_id", "shares_weight", "created_at", "updated_at")
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [Number(vote_id), Number(option_id), user.user_id, sharesWeight]
      );

      // 2. Increment votes_count on the selected option
      await q(
        `UPDATE "vote_options" SET "votes_count" = "votes_count" + 1, "updated_at" = NOW()
         WHERE "option_id" = $1`,
        [Number(option_id)]
      );

      // 3. Recalculate ALL weighted percentages for this vote from scratch
      if (totalShares > 0) {
        const allUserVotes = await q(
          `SELECT "option_id", SUM("shares_weight") as total_weight
           FROM "user_votes" WHERE "vote_id" = $1 GROUP BY "option_id"`,
          [Number(vote_id)]
        );

        for (const row of allUserVotes) {
          const weightedPct = Math.round((Number(row.total_weight) / totalShares) * 10000) / 100;
          await q(
            `UPDATE "vote_options" SET "weighted_percentage" = $1, "updated_at" = NOW()
             WHERE "option_id" = $2`,
            [Math.min(100, weightedPct), row.option_id]
          );
        }

        // Zero out options with no votes
        await q(
          `UPDATE "vote_options" SET "weighted_percentage" = 0, "updated_at" = NOW()
           WHERE "vote_id" = $1 AND "option_id" NOT IN (SELECT "option_id" FROM "user_votes" WHERE "vote_id" = $1)`,
          [Number(vote_id)]
        );
      }
    });

    return NextResponse.json({ success: true, message: 'تم تسجيل صوتك بنجاح!' });
  } catch (err) {
    console.error('Vote cast Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}
