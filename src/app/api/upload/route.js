import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { verifySession } from '@/lib/serverAuth';

/**
 * POST /api/upload
 * Body: { file: 'data:image/...;base64,...', filename?: string }
 * Saves base64 image to public/uploads/ and returns the URL.
 */
export async function POST(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const body = await request.json();
    const { file, filename } = body;

    if (!file) {
      return NextResponse.json({ error: 'لا يوجد ملف' }, { status: 400 });
    }

    // Parse base64 data URL
    const matches = file.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json({ error: 'صيغة الصورة غير مدعومة' }, { status: 400 });
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate filename
    const now = new Date();
    const ts = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 8);
    const finalName = filename || `topup_${ts}_${rand}.${ext}`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, finalName);
    await writeFile(filePath, buffer);

    const url = `/uploads/${finalName}`;

    return NextResponse.json({ success: true, url, filename: finalName });
  } catch (err) {
    console.error('Upload Error:', err);
    return NextResponse.json({ error: 'فشل رفع الملف' }, { status: 500 });
  }
}
