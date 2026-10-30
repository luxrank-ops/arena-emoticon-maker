import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import AdminDashboardClient from '@/components/admin/AdminDashboardClient';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

async function getAdminStats() {
  const [
    totalUsers,
    activeUsersToday,
    totalGenerations,
    generationsToday,
    totalRevenue,
    revenueThisMonth,
    pendingGenerations,
    failedGenerations,
    subscriptionStats,
    recentGenerations,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.generation.count(),
    prisma.generation.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.payment.aggregate({
      where: { status: 'SUCCEEDED' },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        status: 'SUCCEEDED',
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
      _sum: { amount: true },
    }),
    prisma.generation.count({ where: { status: 'PENDING' } }),
    prisma.generation.count({ where: { status: 'FAILED' } }),
    prisma.subscription.groupBy({
      by: ['plan', 'status'],
      _count: true,
    }),
    prisma.generation.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, credits: true, role: true, createdAt: true },
    }),
  ]);

  // 최근 7일간 생성 트렌드
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const dailyGenerations = await prisma.generation.groupBy({
    by: ['createdAt'],
    where: { createdAt: { gte: sevenDaysAgo } },
    _count: true,
  });

  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const count = dailyGenerations.filter(g => g.createdAt >= date && g.createdAt < nextDate).reduce((sum, g) => sum + g._count, 0);
    return { date: format(date, 'M/d', { locale: ko }), count };
  });

  // 플랜별 구독 현황
  const planStats = subscriptionStats.reduce((acc, s) => {
    const key = `${s.plan}_${s.status}`;
    acc[key] = (acc[key] || 0) + s._count;
    return acc;
  }, {} as Record<string, number>);

  return {
    stats: {
      totalUsers,
      activeUsersToday,
      totalGenerations,
      generationsToday,
      totalRevenue: totalRevenue._sum.amount || 0,
      revenueThisMonth: revenueThisMonth._sum.amount || 0,
      pendingGenerations,
      failedGenerations,
    },
    dailyData,
    planStats,
    recentGenerations,
    recentUsers,
  };
}

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();
  return <AdminDashboardClient initialData={stats} />;
}