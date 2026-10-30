'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  BarChart2,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface GenerationItem {
  id: string;
  prompt: string;
  revisedPrompt: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  emotion: string;
  dialogue: string | null;
  style: string;
  model: string;
  size: string;
  quality: string;
  status: string;
  error: string | null;
  creditsUsed: number;
  generationTime: number | null;
  createdAt: string;
  completedAt: string | null;
  user: { id: string; name: string | null; email: string; role: string };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface AdminGenerationsClientProps {
  initialData: {
    generations: GenerationItem[];
    pagination: Pagination;
    stats: { total: number; completed: number; failed: number; pending: number; processing: number };
    modelStats: { model: string; count: number; avgTime: number }[];
    dailyTrend: { date: string; count: number; avgTime: number }[];
    filters: { status: string; model: string; date: string };
  };
}

const STATUS_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: 'PENDING', label: '대기' },
  { value: 'PROCESSING', label: '처리중' },
  { value: 'COMPLETED', label: '완료' },
  { value: 'FAILED', label: '실패' },
];

const MODEL_OPTIONS = [
  { value: '', label: '전체 모델' },
  { value: 'dall-e-3', label: 'DALL·E 3' },
  { value: 'gpt-image-1', label: 'GPT Image' },
  { value: 'stable-diffusion', label: 'Stable Diffusion' },
];

const formatNumber = (num: number) => new Intl.NumberFormat('ko-KR').format(num);

export default function AdminGenerationsClient({ initialData }: AdminGenerationsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [generations, setGenerations] = useState(initialData.generations);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [stats] = useState(initialData.stats);
  const [modelStats] = useState(initialData.modelStats);
  const [dailyTrend] = useState(initialData.dailyTrend);
  const [filters, setFilters] = useState(initialData.filters);
  const [chartView, setChartView] = useState<'trend' | 'model' | 'status'>('trend');

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value, page: '1' };
    setFilters(newFilters);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(newFilters).forEach(([k, v]) => {
        if (v) params.set(k, v);
        else params.delete(k);
      });
      router.push(`/admin/generations?${params.toString()}`);
    });
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/admin/generations?${params.toString()}`);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { label: string; className: string; icon: any }> = {
      COMPLETED: { label: '완료', className: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
      PROCESSING: { label: '처리중', className: 'bg-blue-100 text-blue-700', icon: Loader2 },
      PENDING: { label: '대기', className: 'bg-amber-100 text-amber-700', icon: Clock },
      FAILED: { label: '실패', className: 'bg-red-100 text-red-700', icon: AlertCircle },
    };
    return styles[status] || { label: status, className: 'bg-slate-100 text-slate-700', icon: AlertCircle };
  };

  const formatTime = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}초`;
  };

  const chartColors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">생성 모니터링</h1>
          <p className="text-slate-600 mt-1">실시간 생성 현황과 성능 지표를 확인하세요.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete('page');
            window.open(`/admin/generations/export?${params.toString()}`, '_blank');
          }}>
            <Download className="w-4 h-4 mr-1" />
            내보내기
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card variant="elevated" padding="md">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">전체 생성</p>
              <p className="text-2xl font-bold text-slate-900">{formatNumber(stats.total)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary-600" />
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated" padding="md">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">완료</p>
              <p className="text-2xl font-bold text-emerald-600">{formatNumber(stats.completed)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated" padding="md">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">실패</p>
              <p className="text-2xl font-bold text-red-600">{formatNumber(stats.failed)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated" padding="md">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">처리중</p>
              <p className="text-2xl font-bold text-blue-600">{formatNumber(stats.processing)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated" padding="md">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">대기</p>
              <p className="text-2xl font-bold text-amber-600">{formatNumber(stats.pending)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card variant="outlined" padding="md" className="mb-6">
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="날짜 (YYYY-MM-DD)"
            type="date"
            value={filters.date}
            onChange={(e) => handleFilterChange('date', e.target.value)}
            className="w-full sm:w-[180px]"
          />
          <Select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} options={STATUS_OPTIONS} className="w-full sm:w-[150px]" />
          <Select value={filters.model} onChange={(e) => handleFilterChange('model', e.target.value)} options={MODEL_OPTIONS} className="w-full sm:w-[180px]" />
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Daily Trend Chart */}
        <Card variant="outlined" padding="lg" className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary-600" />
              일별 생성 트렌드 (최근 30일)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrend.slice(-30)}>
                  <defs>
                    <linearGradient id="colorGenerations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tick={{ fill: '#64748b' }} tickFormatter={d => format(new Date(d), 'M/d', { locale: ko })} interval={Math.max(1, Math.floor(dailyTrend.length / 10))} />
                  <YAxis stroke="#94a3b8" fontSize={11} tick={{ fill: '#64748b' }} tickFormatter={formatNumber} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} formatter={(value: number) => [formatNumber(value), '건']} labelFormatter={(label) => format(new Date(label), 'M/d', { locale: ko })} />
                  <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorGenerations)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Model Distribution Pie */}
        <Card variant="outlined" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary-600" />
              모델별 분포
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex flex-col items-center justify-center">
              {modelStats.length > 0 ? (
                <>
                  <ResponsiveContainer width="160" height="160">
                    <PieChart>
                      <Pie
                        data={modelStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="count"
                        nameKey="model"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                        labelLine={false}
                      >
                        {modelStats.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [formatNumber(value), '건']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-3 space-y-2">
                    {modelStats.map((model, index) => (
                      <div key={model.model} className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                        <span className="text-slate-600">{model.model}</span>
                        <span className="font-medium text-slate-900">{formatNumber(model.count)}건</span>
                        <span className="text-slate-500">(평균 {formatTime(model.avgTime)})</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center text-slate-500 py-8 w-full">데이터 없음</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution Bar Chart */}
      <Card variant="outlined" padding="lg" className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            상태별 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { status: '완료', count: stats.completed, color: '#22c55e' },
                { status: '실패', count: stats.failed, color: '#ef4444' },
                { status: '처리중', count: stats.processing, color: '#3b82f6' },
                { status: '대기', count: stats.pending, color: '#f59e0b' },
              ]} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tick={{ fill: '#64748b' }} tickFormatter={formatNumber} />
                <YAxis dataKey="status" type="category" stroke="#94a3b8" fontSize={11} tick={{ fill: '#64748b' }} width={60} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} formatter={(value: number) => [formatNumber(value), '건']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarWidth={30}>
                  {[{ status: '완료', count: stats.completed, color: '#22c55e' }, { status: '실패', count: stats.failed, color: '#ef4444' }, { status: '처리중', count: stats.processing, color: '#3b82f6' }, { status: '대기', count: stats.pending, color: '#f59e0b' }].map((item, index) => (
                    <Cell key={`cell-${index}`} fill={item.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Generations Table */}
      <Card variant="outlined" padding="none">
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left font-medium text-slate-500 w-10">썸네일</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">프롬프트</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500 hidden md:table-cell">사용자</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500 hidden lg:table-cell">모델</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500">상태</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500 hidden lg:table-cell">크레딧</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500 hidden lg:table-cell">소요시간</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">생성일시</th>
                <th className="w-12 px-4 py-3 text-center font-medium text-slate-500">액션</th>
              </tr>
            </thead>
            <tbody>
              {generations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">조건에 맞는 생성 기록이 없습니다.</td>
                </tr>
              ) : (
                generations.map((gen) => {
                  const badge = getStatusBadge(gen.status);
                  const Icon = badge.icon;
                  return (
                    <tr key={gen.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        {gen.thumbnailUrl || gen.imageUrl ? (
                          <img src={gen.thumbnailUrl || gen.imageUrl} alt="" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                        ) : (
                          <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                            <Zap className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-md">
                        <p className="font-medium text-slate-900 truncate">{gen.prompt.slice(0, 60)}...</p>
                        <p className="text-sm text-slate-500 truncate">{gen.revisedPrompt?.slice(0, 80) || '프롬프트 없음'}</p>
                      </td>
                      <td className="px-4 py-3 text-center hidden md:table-cell">
                        <div className="font-medium text-slate-900">{gen.user.name || '익명'}</div>
                        <div className="text-sm text-slate-500">{gen.user.email}</div>
                      </td>
                      <td className="px-4 py-3 text-center hidden lg:table-cell">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">{gen.model}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('px-2 py-1 rounded-full text-xs font-medium flex items-center justify-center gap-1 mx-auto', badge.className)}>
                          <Icon className="w-3 h-3" />
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center hidden lg:table-cell font-medium text-primary-600">{gen.creditsUsed}</td>
                      <td className="px-4 py-3 text-center hidden lg:table-cell text-slate-600 font-mono">{formatTime(gen.generationTime)}</td>
                      <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">{format(new Date(gen.createdAt), 'MM/dd HH:mm', { locale: ko })}</td>
                      <td className="px-4 py-3 text-center">
                        <Button variant="ghost" size="sm" onClick={() => window.open(gen.imageUrl || '#', '_blank')} disabled={!gen.imageUrl}>
                          <Eye className="w-4 h-4" />
                        </Button>
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
      </Card>
    </div>
  );
}

function getStatusBadge(status: string) {
  const styles: Record<string, { label: string; className: string; icon: any }> = {
    COMPLETED: { label: '완료', className: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
    PROCESSING: { label: '처리중', className: 'bg-blue-100 text-blue-700', icon: Loader2 },
    PENDING: { label: '대기', className: 'bg-amber-100 text-amber-700', icon: Clock },
    FAILED: { label: '실패', className: 'bg-red-100 text-red-700', icon: AlertCircle },
  };
  return styles[status] || { label: status, className: 'bg-slate-100 text-slate-700', icon: AlertCircle };
}