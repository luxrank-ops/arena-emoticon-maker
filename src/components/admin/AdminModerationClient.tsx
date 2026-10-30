'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Flag,
  Eye,
  AlertTriangle,
  Shield,
  Loader2,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ModerationItem {
  id: string;
  prompt: string;
  revisedPrompt: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  emotion: string;
  dialogue: string | null;
  style: string;
  status: string;
  error: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string; role: string };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface AdminModerationClientProps {
  initialData: {
    items: ModerationItem[];
    pagination: Pagination;
    stats: { pending: number; approved: number; rejected: number; flagged: number };
    filters: { status: string; type: string };
  };
}

const STATUS_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: 'PENDING', label: '검토 대기' },
  { value: 'COMPLETED', label: '승인됨' },
  { value: 'FAILED', label: '거절됨' },
];

const TYPE_OPTIONS = [
  { value: '', label: '전체 유형' },
  { value: 'inappropriate', label: '부적절한 콘텐츠' },
  { value: 'spam', label: '스팸/도배' },
  { value: 'copyright', label: '저작권 위반' },
  { value: 'other', label: '기타' },
];

const formatNumber = (num: number) => new Intl.NumberFormat('ko-KR').format(num);

export default function AdminModerationClient({ initialData }: AdminModerationClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [items, setItems] = useState(initialData.items);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [stats] = useState(initialData.stats);
  const [filters, setFilters] = useState(initialData.filters);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value, page: '1' };
    setFilters(newFilters);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(newFilters).forEach(([k, v]) => {
        if (v) params.set(k, v);
        else params.delete(k);
      });
      router.push(`/admin/moderation?${params.toString()}`);
    });
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/admin/moderation?${params.toString()}`);
  };

  const handleAction = async (itemId: string, action: 'approve' | 'reject') => {
    // TODO: API 호출로 실제 처리
    console.log(`${action} item:`, itemId);
    // 낙관적 업데이트
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, status: action === 'approve' ? 'COMPLETED' : 'FAILED' } : item
    ));
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedItems.length === 0) return;
    console.log(`Bulk ${action}:`, selectedItems);
    setSelectedItems([]);
  };

  const getStatusInfo = (status: string) => {
    const styles: Record<string, { label: string; className: string; icon: any }> = {
      PENDING: { label: '검토 대기', className: 'bg-amber-100 text-amber-700', icon: Loader2 },
      COMPLETED: { label: '승인됨', className: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
      FAILED: { label: '거절됨', className: 'bg-red-100 text-red-700', icon: XCircle },
    };
    return styles[status] || { label: status, className: 'bg-slate-100 text-slate-700', icon: AlertTriangle };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">콘텐츠 모더레이션</h1>
          <p className="text-slate-600 mt-1">부적절한 콘텐츠를 검토하고 조치하세요.</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedItems.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleBulkAction('approve')}>
                <CheckCircle className="w-4 h-4 mr-1" />
                일괄 승인
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkAction('reject')}>
                <XCircle className="w-4 h-4 mr-1" />
                일괄 거절
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card variant="elevated" padding="md">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">검토 대기</p>
              <p className="text-2xl font-bold text-amber-600">{formatNumber(stats.pending)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-amber-600" />
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated" padding="md">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">승인됨</p>
              <p className="text-2xl font-bold text-emerald-600">{formatNumber(stats.approved)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated" padding="md">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">거절됨</p>
              <p className="text-2xl font-bold text-red-600">{formatNumber(stats.rejected)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated" padding="md">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">플래그됨</p>
              <p className="text-2xl font-bold text-purple-600">{formatNumber(stats.flagged)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Flag className="w-6 h-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card variant="outlined" padding="md" className="mb-6">
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="프롬프트, 사용자 검색..."
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full sm:w-[250px]"
          />
          <Select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} options={STATUS_OPTIONS} className="w-full sm:w-[150px]" />
          <Select value={filters.type} onChange={(e) => handleFilterChange('type', e.target.value)} options={TYPE_OPTIONS} className="w-full sm:w-[180px]" />
        </CardContent>
      </Card>

      {/* Moderation Table */}
      <Card variant="outlined" padding="none">
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="w-12 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === items.length && items.length > 0}
                    onChange={(e) => setSelectedItems(e.target.checked ? items.map(u => u.id) : [])}
                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">콘텐츠</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500 hidden md:table-cell">사용자</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500">유형</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500">상태</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">신고일시</th>
                <th className="w-12 px-4 py-3 text-center font-medium text-slate-500">액션</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">검토할 콘텐츠가 없습니다.</td>
                </tr>
              ) : (
                items.map((item) => {
                  const statusInfo = getStatusInfo(item.status);
                  const Icon = statusInfo.icon;
                  return (
                    <tr key={item.id} className={cn('border-b border-slate-100 hover:bg-slate-50', selectedItems.includes(item.id) && 'bg-primary-50')}>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={(e) => setSelectedItems(prev =>
                            e.target.checked ? [...prev, item.id] : prev.filter(id => id !== item.id)
                          )}
                          className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          {item.thumbnailUrl || item.imageUrl ? (
                            <img src={item.thumbnailUrl || item.imageUrl} alt="" className="w-16 h-16 object-cover rounded-lg border border-slate-200 flex-shrink-0" />
                          ) : (
                            <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Flag className="w-6 h-6 text-slate-400" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-slate-900 truncate">{item.prompt.slice(0, 80)}...</p>
                            {item.revisedPrompt && (
                              <p className="text-sm text-slate-500 truncate mt-1">{item.revisedPrompt.slice(0, 100)}...</p>
                            )}
                            <div className="flex flex-wrap gap-1 mt-1">
                              <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">{item.style}</span>
                              <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">{item.emotion}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center hidden md:table-cell">
                        <div className="font-medium text-slate-900">{item.user.name || '익명'}</div>
                        <div className="text-sm text-slate-500">{item.user.email}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          부적절
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('px-2 py-1 rounded-full text-xs font-medium flex items-center justify-center gap-1 mx-auto', statusInfo.className)}>
                          <Icon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">
                        {format(new Date(item.createdAt), 'MM/dd HH:mm', { locale: ko })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {item.status === 'PENDING' && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleAction(item.id, 'approve')} className="h-8 w-8 p-0" title="승인">
                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleAction(item.id, 'reject')} className="h-8 w-8 p-0" title="거절">
                                <XCircle className="w-4 h-4 text-red-600" />
                              </Button>
                            </>
                          )}
                          {item.status !== 'PENDING' && (
                            <span className="text-xs text-slate-400">처리됨</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                )}
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <CardFooter className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              전체 <strong>{formatNumber(pagination.total)}</strong>건
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={pagination.page === 1 || isPending} onClick={() => handlePageChange(pagination.page - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-3 text-sm font-medium text-slate-700">{pagination.page} / {pagination.totalPages}</span>
              <Button variant="outline" size="sm" disabled={pagination.page === pagination.totalPages || isPending} onClick={() => handlePageChange(pagination.page + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardFooter>
        )}

        {/* Bulk Actions */}
        {selectedItems.length > 0 && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
            <Card variant="elevated" padding="md" className="shadow-xl">
              <div className="flex items-center gap-4">
                <span className="font-medium text-slate-900">{selectedItems.length}건 선택됨</span>
                <Button variant="outline" size="sm" onClick={() => handleBulkAction('approve')}>
                  <CheckCircle className="w-4 h-4 mr-1" /> 일괄 승인
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleBulkAction('reject')}>
                  <XCircle className="w-4 h-4 mr-1" /> 일괄 거절
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedItems([])}>취소</Button>
              </div>
            </Card>
          </div>
        )}
      </Card>
    </div>
  );
}

function getStatusInfo(status: string) {
  const styles: Record<string, { label: string; className: string; icon: any }> = {
    PENDING: { label: '검토 대기', className: 'bg-amber-100 text-amber-700', icon: Loader2 },
    COMPLETED: { label: '승인됨', className: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
    FAILED: { label: '거절됨', className: 'bg-red-100 text-red-700', icon: XCircle },
  };
  return styles[status] || { label: status, className: 'bg-slate-100 text-slate-700', icon: AlertTriangle };
}