import { NextResponse } from 'next/server';
import { getTable, query } from '@/lib/db';
import { verifySession, requireRole } from '@/lib/serverAuth';

const ALL_POSITIONS = [
  // الإدارة العليا والتنفيذية
  { code: 'CEO', name: 'المدير العام', group: 'الإدارة العليا والتنفيذية' },
  { code: 'COO', name: 'مدير العمليات', group: 'الإدارة العليا والتنفيذية' },
  { code: 'CFO', name: 'المدير المالي', group: 'الإدارة العليا والتنفيذية' },
  { code: 'CTO', name: 'المدير التقني', group: 'الإدارة العليا والتنفيذية' },
  { code: 'CMO', name: 'مدير التسويق', group: 'الإدارة العليا والتنفيذية' },
  { code: 'CHRO', name: 'مدير الموارد البشرية', group: 'الإدارة العليا والتنفيذية' },
  { code: 'CPO', name: 'مدير المنتج', group: 'الإدارة العليا والتنفيذية' },
  // الإدارة الوسطى
  { code: 'PM', name: 'مدير مشاريع', group: 'الإدارة الوسطى' },
  { code: 'FM', name: 'مدير حسابات', group: 'الإدارة الوسطى' },
  { code: 'HR', name: 'مدير HR', group: 'الإدارة الوسطى' },
  { code: 'MARKETING', name: 'مدير تسويق', group: 'الإدارة الوسطى' },
  { code: 'SALES', name: 'مدير مبيعات', group: 'الإدارة الوسطى' },
  { code: 'OPS', name: 'مدير تشغيل', group: 'الإدارة الوسطى' },
  { code: 'LEGAL', name: 'مستشار قانوني', group: 'الإدارة الوسطى' },
  { code: 'IT', name: 'مدير معلومات', group: 'الإدارة الوسطى' },
  // المالية والتقنية وصناعة المحتوى
  { code: 'ACCOUNTANT', name: 'المحاسب', group: 'مالية وتقنية ومحتوى' },
  { code: 'SUPERVISOR', name: 'المشرف', group: 'مالية وتقنية ومحتوى' },
  { code: 'ENGINEER', name: 'المهندس', group: 'مالية وتقنية ومحتوى' },
  { code: 'DESIGNER', name: 'المصمم', group: 'مالية وتقنية ومحتوى' },
  { code: 'ANALYST', name: 'المحلل', group: 'مالية وتقنية ومحتوى' },
  { code: 'CREATOR', name: 'صانع المحتوى', group: 'مالية وتقنية ومحتوى' },
  // التشغيلية والخدمات المساندة
  { code: 'RECEPTIONIST', name: 'استقبال', group: 'تشغيلية وخدمات مساندة' },
  { code: 'SECURITY', name: 'أمن', group: 'تشغيلية وخدمات مساندة' },
  { code: 'DRIVER', name: 'سائق', group: 'تشغيلية وخدمات مساندة' },
  { code: 'EMPLOYEE', name: 'موظف عام', group: 'تشغيلية وخدمات مساندة' },
  { code: 'SHIPPING_AGENT', name: 'وكيل الشحن', group: 'تشغيلية وخدمات مساندة' },
];

// GET: List all positions + owner's current roles + pending requests
export async function GET(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('ownerId');

    const [owners, requests] = await Promise.all([
      getTable('owners'),
      getTable('position_requests'),
    ]);

    const owner = owners.find(o => o.owner_id === Number(ownerId));

    // Only the owner themself (or privileged roles) can view their roles
    const roles = await getTable('roles');
    const role = roles.find(r => r.role_id === user.role_id);
    const roleKey = (user.role_name || role?.role_name || '').toLowerCase();
    const isPrivileged = ['admin', 'ceo', 'fm'].includes(roleKey);
    if (owner && owner.user_id !== user.user_id && !isPrivileged) {
      return NextResponse.json({ error: 'غير مصرح — لا يمكنك عرض مناصب مالك آخر' }, { status: 403 });
    }

    const activeRoles = owner ? (owner.active_roles || ['OWNER']) : ['OWNER'];
    const pendingRequests = requests.filter(r =>
      r.owner_id === Number(ownerId) && r.status === 'pending'
    );

    return NextResponse.json({
      positions: ALL_POSITIONS,
      active_roles: activeRoles,
      pending_requests: pendingRequests,
    });
  } catch (err) {
    console.error('Owner Roles GET Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}

// POST: Request a new position (Owner only)
export async function POST(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const body = await request.json();
    const { owner_id, position_code, reason, user_id } = body;

    if (!owner_id || !position_code) {
      return NextResponse.json({ error: 'بيانات مطلوبة مفقودة' }, { status: 400 });
    }

    const pos = ALL_POSITIONS.find(p => p.code === position_code);
    if (!pos) {
      return NextResponse.json({ error: 'منصب غير موجود' }, { status: 400 });
    }

    // Check owner already has this role
    const owners = await getTable('owners');
    const owner = owners.find(o => o.owner_id === Number(owner_id));
    if (!owner) {
      return NextResponse.json({ error: 'المالك غير موجود' }, { status: 404 });
    }

    // Only the owner themself can request a position for themselves
    if (owner.user_id !== user.user_id) {
      return NextResponse.json({ error: 'غير مصرح — يمكنك طلب منصب لنفسك فقط' }, { status: 403 });
    }

    const activeRoles = owner.active_roles || ['OWNER'];
    if (activeRoles.includes(position_code)) {
      return NextResponse.json({ error: `لديك هذا المنصب بالفعل (${pos.name})` }, { status: 400 });
    }

      // Check for pending request for same position
      const requests = await getTable('position_requests');
      const existingPending = requests.find(r =>
        r.owner_id === Number(owner_id) && (r.position === position_code || r.requested_role_name === position_code) && r.status === 'pending'
      );
    if (existingPending) {
      return NextResponse.json({ error: 'لديك طلب معلق لهذا المنصب بالفعل' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO "position_requests"
       ("owner_id", "position", "requested_role_name", "reason", "status", "user_id", "created_at", "updated_at")
       VALUES ($1, $2, $3, $4, 'pending', $5, NOW(), NOW())
       RETURNING *`,
      [owner_id, position_code, pos.name, reason || '', user_id || owner_id]
    );

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error('Owner Roles POST Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}

// PUT: Approve position request (CEO) OR Self-demotion (Owner)
export async function PUT(request) {
  try {
    const { user, error: authError } = await verifySession(request);
    if (authError) return authError;

    const body = await request.json();
    const { request_id, action, owner_id, position_code } = body;

    // === SELF-DEMOTION ===
    if (action === 'demote') {
      if (!owner_id || !position_code) {
        return NextResponse.json({ error: 'بيانات مطلوبة مفقودة' }, { status: 400 });
      }

      if (position_code === 'OWNER') {
        return NextResponse.json({ error: 'لا يمكن حذف المنصب الأساسي OWNER' }, { status: 400 });
      }

      // Verify the requester IS the owner being demoted (server-side check)
      const owners = await getTable('owners');
      const owner = owners.find(o => o.owner_id === Number(owner_id));
      if (!owner) {
        return NextResponse.json({ error: 'المالك غير موجود' }, { status: 404 });
      }

      if (owner.user_id !== user.user_id) {
        return NextResponse.json({ error: 'غير مصرح — يمكنك التنازل عن مناصبك فقط' }, { status: 403 });
      }

      const activeRoles = owner.active_roles || ['OWNER'];
      if (!activeRoles.includes(position_code)) {
        return NextResponse.json({ error: 'لا تملك هذا المنصب' }, { status: 400 });
      }

      // Remove the role from array
      const newRoles = activeRoles.filter(r => r !== position_code);
      await query(
        `UPDATE "owners" SET "active_roles" = $1, "updated_at" = NOW() WHERE "owner_id" = $2`,
        [JSON.stringify(newRoles), owner_id]
      );

      // Also update user's secondary_role_name to reflect combined roles
      const userOwners = await getTable('owners');
      const updatedOwner = userOwners.find(o => o.owner_id === Number(owner_id));
      if (updatedOwner && updatedOwner.user_id) {
        const roleNames = newRoles.filter(r => r !== 'OWNER');
        await query(
          `UPDATE "users" SET "role_name" = $1 WHERE "user_id" = $2`,
          [roleNames.length > 0 ? roleNames.join(', ') : 'Owner', updatedOwner.user_id]
        );
      }

      const pos = ALL_POSITIONS.find(p => p.code === position_code);
      return NextResponse.json({
        success: true,
        message: `تم التنازل عن منصب ${pos?.name || position_code} بنجاح`,
        active_roles: newRoles,
      });
    }

    // === APPROVAL — Server-side role check (CEO/Admin only) ===
    if (action === 'approve') {
      const roleErr = await requireRole(user, ['ceo', 'admin']);
      if (roleErr) return roleErr;

      const requests = await getTable('position_requests');
      const req = requests.find(r => r.request_id === Number(request_id));
      if (!req) {
        return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
      }
      if (req.status !== 'pending') {
        return NextResponse.json({ error: 'الطلب تم معالجته بالفعل' }, { status: 400 });
      }

      // Update request status
      await query(
        `UPDATE "position_requests" SET "status" = 'approved', "approved_by" = $1, "approved_at" = NOW(), "updated_at" = NOW() WHERE "request_id" = $2`,
        [user.user_id, request_id]
      );

      // Add role to owner's active_roles (ACCUMULATION - add, don't replace)
      const owners = await getTable('owners');
      const owner = owners.find(o => o.owner_id === req.owner_id);
      if (owner) {
        const activeRoles = owner.active_roles || ['OWNER'];
        const positionCode = req.position || req.requested_role_name;
        if (!activeRoles.includes(positionCode)) {
          activeRoles.push(positionCode);
          await query(
            `UPDATE "owners" SET "active_roles" = $1, "secondary_role_name" = $2, "updated_at" = NOW() WHERE "owner_id" = $3`,
            [JSON.stringify(activeRoles), positionCode, req.owner_id]
          );

          // Update user's role_name to reflect all roles
          if (owner.user_id) {
            const roleNames = activeRoles.filter(r => r !== 'OWNER');
            await query(
              `UPDATE "users" SET "role_name" = $1 WHERE "user_id" = $2`,
              [roleNames.length > 0 ? roleNames.join(', ') : 'Owner', owner.user_id]
            );
          }
        }
      }

      const pos = ALL_POSITIONS.find(p => p.code === (req.position || req.requested_role_name));
      return NextResponse.json({
        success: true,
        message: `تم اعتماد منصب ${pos?.name || req.position} بنجاح`,
      });
    }

    // === REJECT — Server-side role check (CEO/Admin only) ===
    if (action === 'reject') {
      const roleErr = await requireRole(user, ['ceo', 'admin']);
      if (roleErr) return roleErr;

      await query(
        `UPDATE "position_requests" SET "status" = 'rejected', "approved_by" = $1, "approved_at" = NOW(), "updated_at" = NOW() WHERE "request_id" = $2`,
        [user.user_id, request_id]
      );

      return NextResponse.json({ success: true, message: 'تم رفض الطلب' });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (err) {
    console.error('Owner Roles PUT Error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم.' }, { status: 500 });
  }
}
