import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/serverAuth';
import { query } from '@/lib/db';

export async function POST(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const { conversation_id } = await request.json();
    if (!conversation_id) {
      return NextResponse.json({ error: 'conversation_id مطلوب' }, { status: 400 });
    }

    await query(
      `UPDATE messages SET is_read = true, updated_at = NOW()
       WHERE conversation_id = $1 AND sender_id <> $2 AND is_read = false`,
      [conversation_id, user.user_id]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Mark messages read error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}
