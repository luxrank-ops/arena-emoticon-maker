'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { 
  CreditCard, 
  Zap, 
  RotateCcw, 
  Plus, 
  Minus, 
  Settings,
  Filter,
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface HistoryItem {
  id: string;
  type: 'payment' | 'generation' | 'adjustment';
  credits: number;
  amount: number;
  currency: string;
  description: string;
  metadata: any;
  status: string;
  createdAt: string;
  completedAt?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Summary {
  totalCreditsEarned: number;
  totalCreditsUsed: number;
  netCredits: number;
  totalPayments: number;
  totalGenerations: number;
}

interface CreditHistoryData {
  history: HistoryItem[];
  pagination: Pagination;
  summary: Summary;
}

const TYPE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  payment: { label: '충전', icon: Plus, color: 'emerald' },
  generation: { label: '사용', icon: Minus, color: 'red' },
  adjustment: { label: '조정', icon: Settings, color: 'amber' },
};

const TYPE_FILTERS = [
  { value: '', label: '전체' },
  { value: 'payment', label: '충전' },
  { value: 'generation', label: '사용' },
  { value: 'adjustment', label: '조정' },
];

export default function CreditHistoryPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<CreditHistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('all');

  useEffect(() => {
    fetchHistory();
  }, [filter, dateRange]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.append('type', filter);
      params.append('page', '1');
      params.append('limit', '50');
      
      const response = await fetch(`/api/user/credits/history?${params}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch credit history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCredits = (credits: number) => {
    const prefix = credits > 0 ? '+' : '';
    return `${prefix}${credits.toLocaleString()}`;
  };

  const getTypeInfo = (type: string) => TYPE_LABELS[type] || { label: type, icon: Info, color: 'slate' };

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="container-main max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">크레딧 내역</h1>
            <p className="text-slate-600 mt-1">크레딧 충전, 사용, 조정 내역을 확인하세요.</p>
          </div>
          <Button variant="outline" onClick={() => window.location.href = '/dashboard/credits'}>
            <CreditCard className="w-4 h-4 mr-2" />
            충전하러 가기
          </Button>
        </div>

        {/* Summary Cards */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card variant="elevated" padding="md">
              <CardContent className="text-center">
                <p className="text-2xl font-bold text-emerald-600">{data.summary.totalCreditsEarned.toLocaleString()}</p>
                <p className="text-sm text-slate-500">총 충전/지급</p>
              </CardContent>
            </Card>
            <Card variant="elevated" padding="md">
              <CardContent className="text-center">
                <p className="text-2xl font-bold text-red-600">{data.summary.totalCreditsUsed.toLocaleString()}</p>
                <p className="text-sm text-slate-500">총 사용</p>
              </CardContent>
            </Card>
            <Card variant="elevated" padding="md">
              <CardContent className="text-center">
                <p className={`text-2xl font-bold ${data.summary.netCredits >= 0 ? 'text-primary-600' : 'text-red-600'}`}>
                  {data.summary.netCredits >= 0 ? '+' : ''}{data.summary.netCredits.toLocaleString()}
                </p>
                <p className="text-sm text-slate-500">순 증감</p>
              </CardContent>
            </Card>
            <Card variant="elevated" padding="md">
              <CardContent className="text-center">
                <p className="text-2xl font-bold text-slate-900">{data.summary.totalPayments}</p>
                <p className="text-sm text-slate-500">결제 건수</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card variant="outlined" padding="md" className="mb-6">
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {TYPE_FILTERS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">전체 기간</option>
                <option value="7d">최근 7일</option>
                <option value="30d">최근 30일</option>
                <option value="90d">최근 90일</option>
              </select>
            </div>
            <Button variant="outline" size="sm" className="ml-auto">
              <Download className="w-4 h-4 mr-1" />
              내보내기
            </Button>
          </CardContent>
        </Card>

        {/* History List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Card key={i} variant="outlined" padding="lg">
                <div className="animate-pulse flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/4 bg-slate-200 rounded" />
                    <div className="h-4 w-1/2 bg-slate-200 rounded" />
                  </div>
                  <div className="w-24 h-8 bg-slate-200 rounded" />
                </div>
              </Card>
            ))}
          </div>
        ) : data?.history.length === 0 ? (
          <Card variant="outlined" padding="lg" className="text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">크레딧 내역이 없습니다</h3>
            <p className="text-slate-500 mb-6">첫 크레딧을 충전해보세요!</p>
            <Button variant="primary" onClick={() => window.location.href = '/dashboard/credits'}>
              <Plus className="w-4 h-4 mr-2" />
              크레딧 충전하기
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {data!.history.map((item) => {
              const typeInfo = getTypeInfo(item.type);
              const Icon = typeInfo.icon;
              const isPositive = item.credits > 0;
              
              return (
                <Card key={item.id} variant="outlined" padding="lg" className="hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-xl bg-${typeInfo.color}-100 flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-6 h-6" style={{ color: `var(--${typeInfo.color}-600)` }} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${typeInfo.color}-100 text-${typeInfo.color}-700`}>
                            {typeInfo.label}
                          </span>
                          <span className="text-sm text-slate-500">
                            {format(new Date(item.createdAt), 'yyyy년 M월 d일 HH:mm', { locale: ko })}
                          </span>
                        </div>
                        <p className="font-medium text-slate-900 truncate">{item.description}</p>
                        {item.metadata?.plan && (
                          <p className="text-sm text-slate-500 mt-1">플랜: {item.metadata.plan}</p>
                        )}
                        {item.metadata?.rolloverRate && (
                          <p className="text-sm text-emerald-600 mt-1">
                            이월율: {Math.round(item.metadata.rolloverRate * 100)}%
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1 lg:ml-4">
                      <span className={`text-xl font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCredits(item.credits)}
                      </span>
                      {item.amount > 0 && (
                        <span className="text-sm text-slate-500">
                          {item.amount.toLocaleString()} {item.currency.toUpperCase()}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.status === 'SUCCEEDED' || item.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : item.status === 'FAILED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.status === 'SUCCEEDED' || item.status === 'COMPLETED' ? '완료' :
                         item.status === 'FAILED' ? '실패' : '처리중'}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
              <Card variant="outlined" padding="md">
                <CardFooter className="flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    전체 <strong>{data.pagination.total}</strong>건 중 
                    <strong>{(data.pagination.page - 1) * data.pagination.limit + 1}</strong>~
                    <strong>{Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)}</strong>번째
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={data.pagination.page === 1}
                      onClick={() => { /* 페이지네이션 구현 필요 */ }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="px-3 text-sm font-medium text-slate-700">
                      {data.pagination.page} / {data.pagination.totalPages}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={data.pagination.page === data.pagination.totalPages}
                      onClick={() => { /* 페이지네이션 구현 필요 */ }}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}