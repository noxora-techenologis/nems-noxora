import { NextResponse } from 'next/server';
import { getTable } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = parseInt(searchParams.get('userId') || '0');

    const notifications = await getTable('notifications');
    const userNotifs = userId
      ? notifications.filter(n => n.user_id === userId)
      : [];

    // Sort by date descending
    userNotifs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return NextResponse.json({ notifications: userNotifs });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
