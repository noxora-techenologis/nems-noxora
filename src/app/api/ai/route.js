import { NextResponse } from 'next/server';
import { getTable } from '@/lib/db';

export async function POST(request) {
  try {
    const { prompt } = await request.json();
    if (!prompt) {
      return NextResponse.json({ reply: 'يرجى إدخال سؤال أو طلب.' });
    }

    const q = prompt.toLowerCase();

    const [employees, projects, tasks, attendance, revenues, expenses, owners, salaries, meetings] = await Promise.all([
      getTable('employees'),
      getTable('projects'),
      getTable('tasks'),
      getTable('attendance'),
      getTable('revenues'),
      getTable('expenses'),
      getTable('owners'),
      getTable('salaries'),
      getTable('meetings'),
    ]);

    const today = new Date().toISOString().split('T')[0];

    const totalRevenue = revenues.filter(r => r.status === 'received').reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const totalEmployees = employees.length;
    const todayPresent = attendance.filter(a => a.date === today && a.status === 'present').length;
    const pendingLeaves = (await getTable('leaves')).filter(l => l.status === 'pending').length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalTasks = tasks.length;
    const upcomingMeetings = meetings.filter(m => m.status === 'scheduled').length;

    if (q.includes('إيراد') || q.includes('إيرادات') || q.includes('revenue')) {
      return NextResponse.json({
        reply: `💰 **إجمالي الإيرادات المسجلة:** ${totalRevenue.toLocaleString()} MRU\n\nعدد الفواتير المسجلة: ${revenues.length}\nالفواتير المحصلة: ${revenues.filter(r => r.status === 'received').length}\nالفواتير المعلقة: ${revenues.filter(r => r.status !== 'received').length}`
      });
    }

    if (q.includes('مصروف') || q.includes('مصروفات') || q.includes('expense')) {
      return NextResponse.json({
        reply: `💸 **إجمالي المصروفات:** ${totalExpenses.toLocaleString()} MRU\n\nعدد سجلات المصروفات: ${expenses.length}`
      });
    }

    if (q.includes('ربح') || q.includes('صافي') || q.includes('profit') || q.includes('net')) {
      return NextResponse.json({
        reply: `📊 **صافي الربح الحالي:** ${netProfit.toLocaleString()} MRU\n\nالإيرادات: ${totalRevenue.toLocaleString()} MRU\nالمصروفات: ${totalExpenses.toLocaleString()} MRU\n\n${netProfit >= 0 ? '✅ الشركة في وضع إيجابي' : '⚠️ الشركة تحقق خسائر حالياً'}`
      });
    }

    if (q.includes('حضور') || q.includes('attendance') || q.includes('دوام') || q.includes('غياب')) {
      const rate = totalEmployees > 0 ? Math.round((todayPresent / totalEmployees) * 100) : 0;
      return NextResponse.json({
        reply: `📊 **ملخص الحضور اليوم:**\n\nالموظفون الكلي: ${totalEmployees}\nالحاضرون اليوم: ${todayPresent}\nنسبة الحضور: ${rate}%\nالإجازات المعلقة: ${pendingLeaves}\n\n${rate >= 80 ? '✅ نسبة حضور جيدة' : '⚠️ نسبة الحضور منخفضة'}`
      });
    }

    if (q.includes('مشروع') || q.includes('مشاريع') || q.includes('project')) {
      const statusCounts = {};
      projects.forEach(p => { statusCounts[p.status] = (statusCounts[p.status] || 0) + 1; });
      const statusText = Object.entries(statusCounts).map(([k, v]) => `• ${k}: ${v}`).join('\n');
      return NextResponse.json({
        reply: `📂 **ملخص المشاريع:**\n\nإجمالي المشاريع: ${projects.length}\nالمشاريع النشطة: ${activeProjects}\n\nتوزيع الحالات:\n${statusText || 'لا توجد مشاريع مسجلة'}\n\nإجمالي المهام: ${totalTasks} (مكتملة: ${completedTasks})`
      });
    }

    if (q.includes('موظف') || q.includes('موظفين') || q.includes('employee')) {
      const departments = {};
      employees.forEach(e => { departments[e.department_id] = (departments[e.department_id] || 0) + 1; });
      return NextResponse.json({
        reply: `👥 **ملخص الموظفين:**\n\nإجمالي الموظفين: ${totalEmployees}\nالحاضرون اليوم: ${todayPresent}\nالمهام المكتملة: ${completedTasks}/${totalTasks}\nالاجتماعات القادمة: ${upcomingMeetings}`
      });
    }

    if (q.includes('اجتماع') || q.includes('اجتماعات') || q.includes('meeting')) {
      return NextResponse.json({
        reply: `📅 **ملخص الاجتماعات:**\n\nالاجتماعات المجدولة: ${upcomingMeetings}\nإجمالي الاجتماعات: ${meetings.length}`
      });
    }

    if (q.includes('مالك') || q.includes('ملاك') || q.includes('أسهم') || q.includes('share') || q.includes('owner')) {
      return NextResponse.json({
        reply: `🏛️ **ملخص الملاك والأسهم:**\n\nعدد الملاك المسجلين: ${owners.length}\n\nيمكنك الاطلاع على التفاصيل الكاملة من خلال وحدة الملاك والأسهم.`
      });
    }

    if (q.includes('راتب') || q.includes('رواتب') || q.includes('salary')) {
      const totalSalaries = salaries.reduce((s, sal) => s + (Number(sal.net_salary) || 0), 0);
      const paidSalaries = salaries.filter(s => s.payment_status === 'paid').length;
      return NextResponse.json({
        reply: `💰 **ملخص الرواتب:**\n\nإجمالي صافي الرواتب: ${totalSalaries.toLocaleString()} MRU\nعدد سجلات الرواتب: ${salaries.length}\nالرواتب المدفوعة: ${paidSalaries}\nالرواتب المعلقة: ${salaries.length - paidSalaries}`
      });
    }

    return NextResponse.json({
      reply: `أنا **نوكسورا AI** — مساعدك الذكي. يمكنني مساعدتك في:\n\n• "ما إجمالي الإيرادات؟"\n• "كم المصروفات؟"\n• "ما صافي الربح؟"\n• "ملخص الحضور اليوم"\n• "حالة المشاريع"\n• "عدد الموظفين"\n• "الاجتماعات القادمة"\n• "ملخص الرواتب"\n\nجرّب أي سؤال من هذه الأسئلة!`
    });

  } catch (err) {
    return NextResponse.json({
      reply: 'عذراً، حدث خطأ أثناء تحليل البيانات. يرجى المحاولة لاحقاً.'
    });
  }
}
