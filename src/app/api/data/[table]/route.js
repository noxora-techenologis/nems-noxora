import { NextResponse } from 'next/server';
import { getTable, insertRecord, updateRecord, deleteRecord, SAFE_TABLES } from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const { table } = await params;

    if (!SAFE_TABLES.has(table)) {
      return NextResponse.json({ error: `الجدول "${table}" غير مسموح بالوصول إليه.` }, { status: 403 });
    }

    const data = await getTable(table);

    const { searchParams } = new URL(request.url);
    const filterField = searchParams.get('field');
    const filterValue = searchParams.get('value');

    let result = data;
    if (filterField && filterValue !== null) {
      const safeFields = new Set(Object.keys(data[0] || {}));
      if (safeFields.has(filterField)) {
        result = data.filter(row => String(row[filterField]) === filterValue);
      }
    }

    return NextResponse.json({ data: result, total: result.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { table } = await params;

    if (!SAFE_TABLES.has(table)) {
      return NextResponse.json({ error: `الجدول "${table}" غير مسموح به.` }, { status: 403 });
    }

    const body = await request.json();
    const { _userId, ...record } = body;
    const inserted = await insertRecord(table, record, _userId || 1);

    return NextResponse.json({ success: true, data: inserted }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { table } = await params;

    if (!SAFE_TABLES.has(table)) {
      return NextResponse.json({ error: `الجدول "${table}" غير مسموح به.` }, { status: 403 });
    }

    const body = await request.json();
    const { _id, _userId, ...fields } = body;

    if (!_id) {
      return NextResponse.json({ error: '_id مطلوب للتحديث' }, { status: 400 });
    }

    const updated = await updateRecord(table, _id, fields, _userId || 1);
    if (!updated) {
      return NextResponse.json({ error: 'السجل غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { table } = await params;

    if (!SAFE_TABLES.has(table)) {
      return NextResponse.json({ error: `الجدول "${table}" غير مسموح به.` }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = parseInt(searchParams.get('userId') || '1');

    if (!id) {
      return NextResponse.json({ error: 'id مطلوب للحذف' }, { status: 400 });
    }

    const idValue = isNaN(Number(id)) ? id : Number(id);
    const deleted = await deleteRecord(table, idValue, userId);

    if (!deleted) {
      return NextResponse.json({ error: 'السجل غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
