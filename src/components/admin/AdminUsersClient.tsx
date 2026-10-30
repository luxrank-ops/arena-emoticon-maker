'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Edit,
  Shield,
  UserX,
  CreditCard,
  Mail,
  Trash2,
  Activity,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface UserData {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  credits: number;
  createdAt: string;
  updatedAt: string;
  _count: { generations: number; payments: number };
  subscription: { plan: string; status: string; stripeCurrentPeriodEnd: string | null } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Stats {
  totalUsers: number;
  adminCount: number;
  creatorCount: number;
  activeSubscriptions: number;
}

interface Filters {
  search: string;
  role: string;
  status: string;
  sort: string;
}

interface AdminUsersClientProps {
  initialData: {
    users: UserData[];
    pagination: Pagination;
    stats: Stats;
    filters: Filters;
  };
}

const ROLE_OPTIONS = [
  { value: '', label: '전체 역할' },
  { value: 'USER', label: '일반 사용자' },
  { value: 'CREATOR', label: '크리에이터' },
  { value: 'ADMIN', label: '관리자' },
];

const SORT_OPTIONS = [
  { value: 'createdAt_desc', label: '최신 가입순' },
  { value: 'createdAt_asc', label: '오래된 가입순' },
  { value: 'credits_desc', label: '크레딧 많은순' },
  { value: 'credits_asc', label: '크레딧 적은순' },
  { value: 'generations_desc', label: '생성 많은순' },
];

export default function AdminUsersClient({ initialData }: AdminUsersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [users, setUsers] = useState(initialData.users);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [stats] = useState(initialData.stats);
  const [filters, setFilters] = useState(initialData.filters);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [actionDialog, setActionDialog] = useState<{ type: string; userId?: string } | null>(null);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value, page: '1' };
    setFilters(newFilters);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(newFilters).forEach(([k, v]) => {
        if (v) params.set(k, v);
        else params.delete(k);
      });
      router.push(`/admin/users?${params.toString()}`);
    });
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/admin/users?${params.toString()}`);
  };

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) return;
    // TODO: Implement bulk actions via API
    console.log('Bulk action:', action, selectedUsers);
    setSelectedUsers([]);
  };

  const handleUserAction = async (userId: string, action: string) => {
    // TODO: Implement user actions via API
    console.log('User action:', action, userId);
    setActionDialog(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', minimumFractionDigits: 0 }).format(amount);
  };

  const formatNumber = (num: number) => new Intl.NumberFormat('ko-KR').format(num);

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      ADMIN: 'bg-red-100 text-red-700',
      CREATOR: 'bg-purple-100 text-purple-700',
      USER: 'bg-slate-100 text-slate-700',
    };
    return styles[role] || styles.USER;
  };

  const getSubscriptionBadge = (status: string | null) => {
    if (!status) return { label: '무료', className: 'bg-slate-100 text-slate-700' };
    const styles: Record<string, { label: string; className: string }> = {
      ACTIVE: { label: '활성', className: 'bg-emerald-100 text-emerald-700' },
      CANCELED: { label: '취소됨', className: 'bg-red-100 text-red-700' },
      PAST_DUE: { label: '연체', className: 'bg-amber-100 text-amber-700' },
      TRIALING: { label: '체험중', className: 'bg-blue-100 text-blue-700' },
      INCOMPLETE: { label: '미완료', className: 'bg-slate-100 text-slate-700' },
    };
    return styles[status] || { label: status, className: 'bg-slate-100 text-slate-700' };
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">사용자 관리</h1>
          <p className="text-slate-600 mt-1">전체 사용자 현황을 확인하고 관리하세요.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => handleBulkAction('export')}>
            내보내기
          </Button>
          <Button variant="primary" size="sm" onClick={() => setActionDialog({ type: 'create' })}>
            사용자 추가
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card variant="elevated" padding="md">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">전체 사용자</p>
              <p className="text-2xl font-bold text-slate-900">{formatNumber(stats.totalUsers)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated" padding="md">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">관리자</p>
              <p className="text-2xl font-bold text-slate-900">{formatNumber(stats.adminCount)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated" padding="md">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">크리에이터</p>
              <p className="text-2xl font-bold text-slate-900">{formatNumber(stats.creatorCount)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <UserX className="w-6 h-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated" padding="md">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">구독 중</p>
              <p className="text-2xl font-bold text-slate-900">{formatNumber(stats.activeSubscriptions)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card variant="outlined" padding="md" className="mb-6">
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 min-w-[250px]">
            <Input
              placeholder="이름, 이메일로 검색..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full"
            />
          </div>
          <Select
            value={filters.role}
            onChange={(e) => handleFilterChange('role', e.target.value)}
            options={ROLE_OPTIONS}
            className="w-full sm:w-[180px]"
          />
          <Select
            value={filters.sort}
            onChange={(e) => handleFilterChange('sort', e.target.value)}
            options={SORT_OPTIONS}
            className="w-full sm:w-[180px]"
          />
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card variant="outlined" padding="none">
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="w-12 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={(e) => setSelectedUsers(e.target.checked ? users.map(u => u.id) : [])}
                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    aria-label="전체 선택"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">사용자</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500 hidden md:table-cell">역할</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500 hidden lg:table-cell">구독</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500">크레딧</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500 hidden lg:table-cell">생성 수</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500 hidden lg:table-cell">결제 수</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">가입일</th>
                <th className="w-12 px-4 py-3 text-center font-medium text-slate-500">액션</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                    검색 조건에 맞는 사용자가 없습니다.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className={cn(
                      'border-b border-slate-100 hover:bg-slate-50 transition-colors',
                      selectedUsers.includes(user.id) && 'bg-primary-50'
                    )}
                  >
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => setSelectedUsers(prev =>
                          e.target.checked ? [...prev, user.id] : prev.filter(id => id !== user.id)
                        )}
                        className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium text-sm">
                          {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">{user.name || '이름 없음'}</p>
                          <p className="text-sm text-slate-500 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getRoleBadge(user.role))}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      {user.subscription ? (
                        <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getSubscriptionBadge(user.subscription.status).className)}>
                          {getSubscriptionBadge(user.subscription.status).label}
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">무료</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-medium text-primary-600">{formatNumber(user.credits)}</td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell text-slate-600">{formatNumber(user._count.generations)}</td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell text-slate-600">{formatNumber(user._count.payments)}</td>
                    <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">
                      {format(new Date(user.createdAt), 'yyyy.MM.dd', { locale: ko })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="relative inline-block">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setActionDialog({ type: 'actions', userId: user.id })}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                        {actionDialog?.userId === user.id && actionDialog.type === 'actions' && (
                          <div className="absolute right-0 top-full mt-1 z-50 w-40 bg-white rounded-xl shadow-lg border border-slate-200 py-1 animate-fade-in">
                            <button className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2" onClick={() => handleUserAction(user.id, 'edit')}>
                              <Edit className="w-4 h-4" /> 정보 수정
                            </button>
                            <button className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2" onClick={() => handleUserAction(user.id, 'credits')}>
                              <CreditCard className="w-4 h-4" /> 크레딧 조정
                            </button>
                            <button className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2" onClick={() => handleUserAction(user.id, 'email')}>
                              <Mail className="w-4 h-4" /> 이메일 발송
                            </button>
                            {user.role !== 'ADMIN' && (
                              <button className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2" onClick={() => handleUserAction(user.id, 'promote')}>
                                <Shield className="w-4 h-4" /> 관리자 권한 부여
                              </button>
                            )}
                            <hr className="my-1 border-slate-200" />
                            <button className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2" onClick={() => handleUserAction(user.id, 'suspend')}>
                              <UserX className="w-4 h-4" /> 계정 정지
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <CardFooter className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              전체 <strong>{formatNumber(pagination.total)}</strong>명 중 <strong>{(pagination.page - 1) * pagination.limit + 1}</strong>~<strong>{Math.min(pagination.page * pagination.limit, pagination.total)}</strong>번째
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1 || isPending}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-3 text-sm font-medium text-slate-700">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages || isPending}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardFooter>
        )}

        {/* Bulk Actions Bar */}
        {selectedUsers.length > 0 && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
            <Card variant="elevated" padding="md" className="shadow-xl">
              <div className="flex items-center gap-4">
                <span className="font-medium text-slate-900">{selectedUsers.length}명 선택됨</span>
                <Button variant="outline" size="sm" onClick={() => handleBulkAction('credits')}>
                  크레딧 지급
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleBulkAction('role')}>
                  역할 변경
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleBulkAction('suspend')}>
                  정지
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedUsers([])}>
                  취소
                </Button>
              </div>
            </Card>
          </div>
        )}
      </Card>
    </div>
  );
}