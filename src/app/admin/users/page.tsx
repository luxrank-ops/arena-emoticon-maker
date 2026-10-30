import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import AdminUsersClient from '@/components/admin/AdminUsersClient';

async function getUsersData(searchParams: Promise<{ page?: string; search?: string; role?: string; status?: string; sort?: string }>) {
  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const search = params.search || '';
  const role = params.role || '';
  const status = params.status || '';
  const sort = params.sort || 'createdAt_desc';

  const limit = 20;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (role) {
    where.role = role;
  }

  const [sortField, sortOrder] = sort.split('_');
  const orderBy: any = { [sortField]: sortOrder };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        credits: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { generations: true, payments: true },
        },
        subscription: {
          select: { plan: true, status: true, stripeCurrentPeriodEnd: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  // 통계
  const [totalUsers, adminCount, creatorCount, activeSubscriptions] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: { role: 'CREATOR' } }),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    stats: {
      totalUsers,
      adminCount,
      creatorCount,
      activeSubscriptions,
    },
    filters: { search, role, status, sort },
  };
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string; role?: string; status?: string; sort?: string }> }) {
  const data = await getUsersData(searchParams);
  return <AdminUsersClient initialData={data} />;
}