import { NextResponse } from 'next/server';
import { getTable, insertRecord, updateRecord, deleteRecord, SAFE_TABLES } from '@/lib/db';
import { verifySession } from '@/lib/serverAuth';

// Field whitelist per table — only these fields can be updated via generic PUT
const ALLOWED_FIELDS = {
  users: ['name', 'email', 'phone', 'avatar', 'status', 'role_id'],
};

// Roles allowed to edit other users' records
const USER_EDIT_ROLES = ['admin', 'ceo', 'hr'];

export async function GET(request, { params }) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const { table } = await params;

    if (!SAFE_TABLES.has(table)) {
      return NextResponse.json({ error: `الجدول "${table}" غير مسموح بالوصول إليه.` }, { status: 403 });
    }

    const data = await getTable(table);

    // Never expose password hashes to clients
    let result = table === 'users'
      ? data.map(({ password_hash, ...rest }) => rest)
      : data;

    const { searchParams } = new URL(request.url);
    const filterField = searchParams.get('field');
    const filterValue = searchParams.get('value');

    if (filterField && filterValue !== null) {
      const safeFields = new Set(Object.keys(result[0] || {}));
      if (safeFields.has(filterField)) {
        result = result.filter(row => String(row[filterField]) === filterValue);
      }
    }

    return NextResponse.json({ data: result, total: result.length });
  } catch (err) {
    console.error('Data GET Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const { table } = await params;

    if (!SAFE_TABLES.has(table)) {
      return NextResponse.json({ error: `الجدول "${table}" غير مسموح به.` }, { status: 403 });
    }

    const body = await request.json();
    const { _userId, ...record } = body;

    // Messages: enforce identity + validation server-side
    if (table === 'messages') {
      if (!record.conversation_id) {
        return NextResponse.json({ error: 'conversation_id مطلوب' }, { status: 400 });
      }
      if (!record.message_text || !String(record.message_text).trim()) {
        return NextResponse.json({ error: 'نص الرسالة مطلوب' }, { status: 400 });
      }
      record.sender_id = user.user_id;
      record.message_text = String(record.message_text).trim();
    }

    const inserted = await insertRecord(table, record, user.user_id);

    return NextResponse.json({ success: true, data: inserted }, { status: 201 });
  } catch (err) {
    console.error('Data POST Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const { table } = await params;

    if (!SAFE_TABLES.has(table)) {
      return NextResponse.json({ error: `الجدول "${table}" غير مسموح به.` }, { status: 403 });
    }

    const body = await request.json();
    const { _id, _userId, ...fields } = body;

    if (!_id) {
      return NextResponse.json({ error: '_id مطلوب للتحديث' }, { status: 400 });
    }

    // For users table: enforce authorization and field whitelist
    if (table === 'users') {
      const isSelf = user.user_id === Number(_id);
      const isPrivileged = USER_EDIT_ROLES.includes((user.role_name || '').toLowerCase());
      if (!isSelf && !isPrivileged) {
        return NextResponse.json({ error: 'لا تملك صلاحية تعديل حساب مستخدم آخر' }, { status: 403 });
      }

      // Only allow non-privileged users to update their own basic info
      const allowed = isPrivileged
        ? (ALLOWED_FIELDS.users || [])
        : ['name', 'email', 'phone', 'avatar'];

      // Email uniqueness check
      if (fields.email) {
        const allUsers = await getTable('users');
        const dup = allUsers.find(u => u.email?.toLowerCase() === fields.email.toLowerCase() && u.user_id !== Number(_id));
        if (dup) {
          return NextResponse.json({ error: 'البريد الإلكتروني مستخدم بالفعل' }, { status: 409 });
        }
      }

      const sanitized = {};
      for (const key of allowed) {
        if (fields[key] !== undefined) sanitized[key] = fields[key];
      }

      const updated = await updateRecord(table, _id, sanitized, user.user_id);
      if (!updated) {
        return NextResponse.json({ error: 'السجل غير موجود' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: updated });
    }

    const updated = await updateRecord(table, _id, fields, user.user_id);
    if (!updated) {
      return NextResponse.json({ error: 'السجل غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('Data PUT Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const { table } = await params;

    if (!SAFE_TABLES.has(table)) {
      return NextResponse.json({ error: `الجدول "${table}" غير مسموح به.` }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id مطلوب للحذف' }, { status: 400 });
    }

    const idValue = isNaN(Number(id)) ? id : Number(id);
    const deleted = await deleteRecord(table, idValue, user.user_id);

    if (!deleted) {
      return NextResponse.json({ error: 'السجل غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Data DELETE Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}
