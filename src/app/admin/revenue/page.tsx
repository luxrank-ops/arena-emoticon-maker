import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import AdminRevenueClient from '@/components/admin/AdminRevenueClient';

async function getRevenueData(searchParams: Promise<{ period?: string }>) {
  const params = await searchParams;
  const period = params.period || '30d';

  const now = new Date();
  let startDate: Date;
  let groupBy: 'day' | 'week' | 'month' = 'day';

  switch (period) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      groupBy = 'day';
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      groupBy = 'day';
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      groupBy = 'week';
      break;
    case '1y':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      groupBy = 'month';
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // 결제 데이터 조회
  const payments = await prisma.payment.findMany({
    where: {
      status: 'SUCCEEDED',
      createdAt: { gte: startDate },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      amount: true,
      currency: true,
      creditsGranted: true,
      description: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  // 구독 데이터 조회
  const subscriptions = await prisma.subscription.findMany({
    where: { status: 'ACTIVE' },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  // 집계 계산
  const totalRevenue = (payments as Array<{ amount: number }>).reduce((sum, p) => sum + p.amount, 0);
  const totalTransactions = payments.length;
  const avgOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // 신규 구독자 수 (기간 내 생성된 구독)
  const newSubscriptions = await prisma.subscription.count({
    where: { createdAt: { gte: startDate } },
  });

  // 해지된 구독 수
  const canceledSubscriptions = await prisma.subscription.count({
    where: { status: 'CANCELED', updatedAt: { gte: startDate } },
  });

  // 일/주/월별 수익 그룹화
  const revenueByPeriod = (payments as Array<{ amount: number; createdAt: Date }>).reduce<Record<string, number>>((acc, payment) => {
    let key: string;
    const date = new Date(payment.createdAt);
    if (groupBy === 'day') {
      key = date.toISOString().split('T')[0];
    } else if (groupBy === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    acc[key] = (acc[key] || 0) + payment.amount;
    return acc;
  }, {});

  // 연속된 기간 데이터 생성
  const chartData = [];
  let current = new Date(startDate);
  while (current <= now) {
    let key: string;
    if (groupBy === 'day') {
      key = current.toISOString().split('T')[0];
    } else if (groupBy === 'week') {
      const weekStart = new Date(current);
      weekStart.setDate(current.getDate() - current.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else {
      key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
    }
    chartData.push({
      period: key,
      revenue: revenueByPeriod[key] || 0,
      label: groupBy === 'day'
        ? new Date(key).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
        : groupBy === 'week'
          ? `${new Date(key).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) } 주`
          : new Date(key).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short' }),
    });
    if (groupBy === 'day') current.setDate(current.getDate() + 1);
    else if (groupBy === 'week') current.setDate(current.getDate() + 7);
    else current.setMonth(current.getMonth() + 1);
  }

  // 플랜별 수익
  const planRevenue = await prisma.payment.groupBy({
    by: ['description'],
    where: { status: 'SUCCEEDED', createdAt: { gte: startDate } },
    _sum: { amount: true },
    _count: true,
  });

  // 상위 결제 사용자
  const topUsers = (payments as Array<{ amount: number; createdAt: Date; user: { id: string; name: string | null; email: string; role: string } }>).reduce<Record<string, { user: { id: string; name: string | null; email: string; role: string }; total: number; count: number }>>((acc, p) => {
    const key = p.user.id;
    if (!acc[key]) {
      acc[key] = { user: p.user, total: 0, count: 0 };
    }
    acc[key].total += p.amount;
    acc[key].count += 1;
    return acc;
  }, {});

  const topUsersList = Object.values(topUsers)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // MRR 계산 (활성 구독의 월간 수익)
  const mrr = (subscriptions as Array<{ plan: string }>).reduce((sum, sub) => {
    const planPrices: Record<string, number> = {
      STARTER: 9900,
      PRO: 29900,
      ENTERPRISE: 99900,
    };
    return sum + (planPrices[sub.plan] || 0);
  }, 0);

  const arr = mrr * 12;

  return {
    summary: {
      totalRevenue,
      totalTransactions,
      avgOrderValue,
      newSubscriptions,
      canceledSubscriptions,
      netSubscriptions: newSubscriptions - canceledSubscriptions,
      mrr,
      arr,
      activeSubscriptions: subscriptions.length,
    },
    chartData,
    planRevenue,
    topUsers: topUsersList,
    recentPayments: payments.slice(-20).reverse(),
    period,
  };
}

export default async function AdminRevenuePage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const data = await getRevenueData(searchParams);
  return <AdminRevenueClient initialData={data} />;
}