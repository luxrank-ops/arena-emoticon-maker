import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import AdminModerationClient from '@/components/admin/AdminModerationClient';

async function getModerationData(searchParams: Promise<{ page?: string; status?: string; type?: string }>) {
  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const status = params.status || '';
  const type = params.type || '';
  const limit = 20;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (status) where.status = status;
  if (type) where.type = type;

  // 실제로는 별도 moderation 테이블이 필요하지만, 여기서는 generation을 예로 듦
  const [items, total] = await Promise.all([
    prisma.generation.findMany({
      where: {
        ...where,
        OR: [
          { prompt: { contains: '부적절', mode: 'insensitive' } },
          { revisedPrompt: { contains: '부적절', mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
    prisma.generation.count({ where }),
  ]);

  // 통계
  const [pendingCount, approvedCount, rejectedCount, flaggedCount] = await Promise.all([
    prisma.generation.count({ where: { status: 'PENDING' } }),
    prisma.generation.count({ where: { status: 'COMPLETED' } }),
    prisma.generation.count({ where: { status: 'FAILED' } }),
    prisma.generation.count({
      where: {
        OR: [
          { prompt: { contains: '부적절', mode: 'insensitive' } },
          { revisedPrompt: { contains: '부적절', mode: 'insensitive' } },
        ],
      },
    }),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    stats: { pending: pendingCount, approved: approvedCount, rejected: rejectedCount, flagged: flaggedCount },
    filters: { status, type },
  };
}

export default async function AdminModerationPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string; type?: string }> }) {
  const data = await getModerationData(searchParams);
  return <AdminModerationClient initialData={data} />;
}