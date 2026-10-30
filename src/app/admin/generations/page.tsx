import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import AdminGenerationsClient from '@/components/admin/AdminGenerationsClient';

async function getGenerationsData(searchParams: Promise<{ page?: string; status?: string; model?: string; date?: string }>) {
  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const status = params.status || '';
  const model = params.model || '';
  const date = params.date || '';
  const limit = 20;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (status) where.status = status;
  if (model) where.model = model;
  if (date) {
    const startDate = new Date(date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
    where.createdAt = { gte: startDate, lt: endDate };
  }

  const [generations, total, stats] = await Promise.all([
    prisma.generation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
    prisma.generation.count({ where }),
    prisma.generation.groupBy({
      by: ['status'],
      _count: true,
    }),
  ]);

  // 모델별 통계
  const modelStats = await prisma.generation.groupBy({
    by: ['model'],
    _count: true,
    _avg: { generationTime: true },
  });

  // 일별 생성 트렌드 (최근 30일)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const dailyTrend = await prisma.generation.groupBy({
    by: ['createdAt'],
    where: { createdAt: { gte: thirtyDaysAgo } },
    _count: true,
    _avg: { generationTime: true },
  });

  // 상태별 통계 변환
  const statusStats = (stats as Array<{ status: string; _count: number }>).reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = s._count;
    return acc;
  }, {});

  return {
    generations,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    stats: {
      total: total,
      completed: statusStats.COMPLETED || 0,
      failed: statusStats.FAILED || 0,
      pending: statusStats.PENDING || 0,
      processing: statusStats.PROCESSING || 0,
    },
    modelStats: (modelStats as Array<{ model: string; _count: number; _avg: { generationTime: number | null } }>).map(m => ({
      model: m.model,
      count: m._count,
      avgTime: m._avg.generationTime || 0,
    })),
    dailyTrend: (dailyTrend as Array<{ createdAt: Date; _count: number; _avg: { generationTime: number | null } }>).map(d => ({
      date: new Date(d.createdAt).toISOString().split('T')[0],
      count: d._count,
      avgTime: d._avg.generationTime || 0,
    })),
    filters: { status, model, date },
  };
}

export default async function AdminGenerationsPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string; model?: string; date?: string }> }) {
  const data = await getGenerationsData(searchParams);
  return <AdminGenerationsClient initialData={data} />;
}