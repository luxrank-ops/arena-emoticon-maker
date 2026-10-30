'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
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

interface RevenueSummary {
  totalRevenue: number;
  totalTransactions: number;
  avgOrderValue: number;
  newSubscriptions: number;
  canceledSubscriptions: number;
  netSubscriptions: number;
  mrr: number;
  arr: number;
  activeSubscriptions: number;
}

interface ChartDataPoint {
  period: string;
  revenue: number;
  label: string;
}

interface PlanRevenueItem {
  description: string | null;
  _sum: { amount: number | null };
  _count: number;
}

interface TopUser {
  user: { id: string; name: string | null; email: string; role: string };
  total: number;
  count: number;
}

interface PaymentItem {
  amount: number;
  currency: string;
  creditsGranted: number;
  description: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string; role: string };
}

interface AdminRevenueClientProps {
  initialData: {
    summary: RevenueSummary;
    chartData: ChartDataPoint[];
    planRevenue: PlanRevenueItem[];
    topUsers: TopUser[];
    recentPayments: PaymentItem[];
    period: string;
  };
}

const PERIOD_OPTIONS = [
  { value: '7d', label: '최근 7일' },
  { value: '30d', label: '최근 30일' },
  { value: '90d', label: '최근 90일' },
  { value: '1y', label: '최근 1년' },
];

const formatCurrency = (amount: number) => {
  if (amount >= 100000000) return `${(amount / 100000000).toFixed(1)}억`;
  if (amount >= 10000) return `${(amount / 10000).toFixed(1)}만`;
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', minimumFractionDigits: 0 }).format(amount);
};

const formatNumber = (num: number) => new Intl.NumberFormat('ko-KR').format(num);

export default function AdminRevenueClient({ initialData }: AdminRevenueClientProps) {
  const searchParams = useSearchParams();
  const [period, setPeriod] = useState(initialData.period);

  const { summary, chartData, planRevenue, topUsers, recentPayments } = initialData;

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', newPeriod);
    window.location.href = `/admin/revenue?${params.toString()}`;
  };

  const summaryCards = [
    {
      title: '총 수익',
      value: formatCurrency(summary.totalRevenue),
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'MRR (월 반복 수익)',
      value: formatCurrency(summary.mrr),
      change: '+8.2%',
      trend: 'up',
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'ARR (연 반복 수익)',
      value: formatCurrency(summary.arr),
      change: '+8.2%',
      trend: 'up',
      icon: Calendar,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      title: '평균 주문 금액',
      value: formatCurrency(summary.avgOrderValue),
      change: '-2.1%',
      trend: 'down',
      icon: ShoppingCart,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: '총 거래 수',
      value: formatNumber(summary.totalTransactions),
      change: '+15.3%',
      trend: 'up',
      icon: CreditCard,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: '활성 구독',
      value: formatNumber(summary.activeSubscriptions),
      change: summary.netSubscriptions >= 0 ? `+${summary.netSubscriptions}` : `${summary.netSubscriptions}`,
      trend: summary.netSubscriptions >= 0 ? 'up' : 'down',
      icon: Users,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
  ];

  const planColors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const planData = planRevenue
    .filter(p => p.description)
    .map((p, i) => ({
      name: p.description!.replace('구독 갱신 크레딧: ', '').replace('크레딧 충전: ', ''),
      value: p._sum.amount || 0,
      count: p._count,
      color: planColors[i % planColors.length],
    }));

  return (
    <div className="space-y-6">
      {/* Header & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">수익 분석</h1>
          <p className="text-slate-600 mt-1">매출 현황과 구독 지표를 실시간으로 확인하세요.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {PERIOD_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <Button variant="outline" size="sm">
            리포트 다운로드
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {summaryCards.map((stat, index) => (
          <Card key={stat.title} variant="elevated" padding="md" className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-transparent" style={{ backgroundImage: `linear-gradient(to bottom left, transparent, ${stat.color.replace('text-', '').replace('-600', '-200')})` }} />
            <CardContent className="relative flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                <div className="flex items-center gap-1 mt-2">
                  {stat.trend === 'up' && <ArrowUpRight className="w-4 h-4 text-green-600" />}
                  {stat.trend === 'down' && <ArrowDownRight className="w-4 h-4 text-red-600" />}
                  <span className={cn('text-sm font-medium', stat.trend === 'up' ? 'text-green-600' : 'text-red-600')}>
                    {stat.change}
                  </span>
                  <span className="text-xs text-slate-400">전기 대비</span>
                </div>
              </div>
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', stat.bg)}>
                <stat.icon className={cn('w-6 h-6', stat.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Trend */}
        <Card variant="outlined" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              수익 트렌드
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tick={{ fill: '#64748b' }} interval={Math.max(1, Math.floor(chartData.length / 10))} />
                  <YAxis stroke="#94a3b8" fontSize={11} tick={{ fill: '#64748b' }} tickFormatter={v => formatCurrency(v / 10000) + '만' } />
<Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [formatCurrency(typeof value === 'number' ? value : 0), '원']}
                    labelFormatter={(label) => label}
/>
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Plan Revenue Distribution */}
        <Card variant="outlined" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary-600" />
              플랜별 수익 분포
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex flex-col items-center justify-center">
              {planData.length > 0 ? (
                <>
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie
                        data={planData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(1)}%`}
                        labelLine={false}
                      >
                        {planData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [formatCurrency(typeof value === 'number' ? value : 0), '원']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 flex flex-wrap justify-center gap-3">
                    {planData.map((plan) => (
                      <div key={plan.name} className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: plan.color }} />
                        <span className="text-slate-600">{plan.name}</span>
                        <span className="font-medium text-slate-900">{formatCurrency(plan.value)}</span>
                        <span className="text-slate-500">({plan.count}건)</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center text-slate-500 py-12 w-full">
                  <p>수익 데이터가 없습니다.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Transactions Bar Chart */}
        <Card variant="outlined" padding="lg" className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary-600" />
              일별 거래 건수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} tick={{ fill: '#64748b' }} tickFormatter={formatNumber} />
                  <YAxis dataKey="label" type="category" stroke="#94a3b8" fontSize={11} tick={{ fill: '#64748b' }} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} formatter={(value: any) => [formatNumber(typeof value === 'number' ? value : 0), '건']} />
                  <Bar dataKey="revenue" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Users */}
        <Card variant="outlined" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-600" />
              TOP 10 고객
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topUsers.length > 0 ? (
              topUsers.map((item, index) => (
                <div key={item.user.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <span className="w-6 h-6 flex items-center justify-center bg-primary-100 text-primary-700 rounded-full text-sm font-bold">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{item.user.name || '익명'}</p>
                    <p className="text-xs text-slate-500 truncate">{item.user.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">{formatCurrency(item.total)}</p>
                    <p className="text-xs text-slate-500">{item.count}건</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-500 py-8">데이터가 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments Table */}
      <Card variant="outlined" padding="md">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center justify-between">
            <span>최근 결제 내역</span>
            <Button variant="ghost" size="sm">전체 보기</Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-medium text-slate-500">결제일시</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-500">사용자</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-500">상품</th>
                  <th className="text-center py-2 px-3 font-medium text-slate-500">크레딧</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-500">금액</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.slice(0, 10).map((payment) => (
                  <tr key={payment.createdAt + payment.user.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {format(new Date(payment.createdAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-900">{payment.user.name || '익명'}</div>
                      <div className="text-slate-500 text-xs">{payment.user.email}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-700 max-w-xs truncate">{payment.description || '상품'}</td>
                    <td className="py-3 px-3 text-center font-medium text-primary-600">{formatNumber(payment.creditsGranted)}</td>
                    <td className="py-3 px-3 text-right font-medium text-emerald-600">{formatCurrency(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}