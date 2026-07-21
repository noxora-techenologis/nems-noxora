import { NextResponse } from 'next/server';
import { getTable } from '@/lib/db';

export async function GET() {
  try {
    const [employees, projects, tasks, attendance, revenues, expenses, leaves, announcements] = await Promise.all([
      getTable('employees'),
      getTable('projects'),
      getTable('tasks'),
      getTable('attendance'),
      getTable('revenues'),
      getTable('expenses'),
      getTable('leaves'),
      getTable('announcements'),
    ]);

    const today = new Date().toISOString().split('T')[0];

    // Stats
    const totalEmployees = employees.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const totalRevenue = revenues.filter(r => r.status === 'received').reduce((s, r) => s + r.amount, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const todayAttendance = attendance.filter(a => a.date === today && a.status === 'present').length;
    const pendingLeaves = leaves.filter(l => l.status === 'pending').length;

    // Projects health
    const projectsWithHealth = projects.map(p => ({
      project_id: p.project_id,
      name: p.name,
      status: p.status,
      progress: p.progress,
      health_score: p.health_score,
      priority: p.priority,
      end_date: p.end_date,
      budget: p.budget,
    }));

    // Recent announcements
    const recentAnnouncements = announcements.slice(-3).reverse();

    // Task stats
    const taskStats = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      new: tasks.filter(t => t.status === 'new').length,
    };

    return NextResponse.json({
      stats: {
        totalEmployees,
        activeProjects,
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        todayAttendance,
        pendingLeaves,
        attendanceRate: totalEmployees > 0 ? Math.round((todayAttendance / totalEmployees) * 100) : 0,
      },
      projects: projectsWithHealth,
      taskStats,
      recentAnnouncements,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
