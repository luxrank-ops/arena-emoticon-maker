'use client';

import { useState } from 'react';
import {
  Users,
  Zap,
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  CreditCard,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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

interface AdminStats {
  stats: {
    totalUsers: number;
    activeUsersToday: number;
    totalGenerations: number;
    generationsToday: number;
    totalRevenue: number;
    revenueThisMonth: number;
    pendingGenerations: number;
    failedGenerations: number;
  };
  dailyData: { date: string; count: number }[];
  planStats: Record<string, number>;
  recentGenerations: any[];
  recentUsers: any[];
}

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

interface AdminDashboardClientProps {
  initialData: AdminStats;
}

export default function AdminDashboardClient({ initialData }: AdminDashboardClientProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  const { stats, dailyData, planStats, recentGenerations, recentUsers } = initialData;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', minimumFractionDigits: 0 }).format(amount);
  };

  const formatNumber = (num: number) => new Intl.NumberFormat('ko-KR').format(num);

  const getChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  // Mock previous period data for demo
  const prevStats = {
    totalUsers: Math.max(0, stats.totalUsers - stats.activeUsersToday),
    totalGenerations: Math.max(0, stats.totalGenerations - stats.generationsToday),
    totalRevenue: Math.max(0, stats.totalRevenue - stats.revenueThisMonth),
  };

  const statCards = [
    {
      title: '총 사용자',
      value: formatNumber(stats.totalUsers),
      change: getChange(stats.totalUsers, prevStats.totalUsers),
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      trend: 'up',
    },
    {
      title: '오늘 활성 사용자',
      value: formatNumber(stats.activeUsersToday),
      change: 12,
      icon: Activity,
      color: 'text-green-600',
      bg: 'bg-green-50',
      trend: 'up',
    },
    {
      title: '총 생성 수',
      value: formatNumber(stats.totalGenerations),
      change: getChange(stats.totalGenerations, prevStats.totalGenerations),
      icon: Zap,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      trend: 'up',
    },
    {
      title: '오늘 생성 수',
      value: formatNumber(stats.generationsToday),
      change: 8,
      icon: Zap,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      trend: 'up',
    },
    {
      title: '총 수익',
      value: formatCurrency(stats.totalRevenue),
      change: getChange(stats.totalRevenue, prevStats.totalRevenue),
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      trend: 'up',
    },
    {
      title: '이번 달 수익',
      value: formatCurrency(stats.revenueThisMonth),
      change: 15,
      icon: CreditCard,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      trend: 'up',
    },
    {
      title: '처리 대기',
      value: formatNumber(stats.pendingGenerations),
      change: 0,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      trend: stats.pendingGenerations > 10 ? 'down' : 'neutral',
    },
    {
      title: '실패 건수',
      value: formatNumber(stats.failedGenerations),
      change: -5,
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      trend: 'down',
    },
  ];

  const planData = [
    { name: 'FREE', value: planStats['FREE_ACTIVE'] || 0, color: '#94a3b8' },
    { name: 'STARTER', value: planStats['STARTER_ACTIVE'] || 0, color: '#3b82f6' },
    { name: 'PRO', value: planStats['PRO_ACTIVE'] || 0, color: '#8b5cf6' },
    { name: 'ENTERPRISE', value: planStats['ENTERPRISE_ACTIVE'] || 0, color: '#f59e0b' },
  ].filter(p => p.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">관리자 대시보드</h1>
          <p className="text-slate-600 mt-1">시스템 현황을 한눈에 확인하세요.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="7d">최근 7일</option>
            <option value="30d">최근 30일</option>
            <option value="90d">최근 90일</option>
          </select>
          <Button variant="primary" size="sm">
            리포트 내보내기
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        {statCards.map((stat, index) => (
          <Card key={stat.title} variant="elevated" padding="md" className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-transparent to-current/10" style={{ '--tw-gradient-from': stat.color.replace('text-', '').replace('-600', '-500') }} />
            <CardContent className="relative flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                <div className="flex items-center gap-1 mt-2">
                  {stat.trend === 'up' && <ArrowUpRight className="w-4 h-4 text-green-600" />}
                  {stat.trend === 'down' && <ArrowDownRight className="w-4 h-4 text-red-600" />}
                  {stat.trend === 'neutral' && <span className="w-4 h-4 text-slate-400">−</span>}
                  <span className={cn('text-sm font-medium', stat.trend === 'up' ? 'text-green-600' : stat.trend === 'down' ? 'text-red-600' : 'text-slate-500')}>
                    {stat.change > 0 ? '+' : ''}{stat.change}%
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Generations Chart */}
        <Card variant="outlined" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-600" />
              일별 생성 트렌드
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="colorGenerations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tick={{ fill: '#64748b' }} />
                  <YAxis stroke="#94a3b8" fontSize={12} tick={{ fill: '#64748b' }} tickFormatter={formatNumber} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [formatNumber(value), '건']}
                    labelFormatter={(label) => `${label}일`}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorGenerations)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Plan Distribution Pie Chart */}
        <Card variant="outlined" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary-600" />
              구독 플랜 분포
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 flex items-center justify-center">
              {planData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                      labelLine={false}
                    >
                      {planData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatNumber(value), '명']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-slate-500 py-12">
                  <p>구독 데이터가 없습니다.</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {planData.map((plan) => (
                <div key={plan.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: plan.color }} />
                  <span className="text-sm text-slate-600">{plan.name}: {formatNumber(plan.value)}명</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Bar Chart */}
        <Card variant="outlined" padding="lg" className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              일별 수익
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={12} tick={{ fill: '#64748b' }} tickFormatter={v => formatCurrency(v / 10000) + '만' } />
                  <YAxis dataKey="date" type="category" stroke="#94a3b8" fontSize={12} tick={{ fill: '#64748b' }} width={60} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    formatter={(value: number) => [formatCurrency(value), '원']}
                  />
                  <Bar dataKey="count" fill="#22c55e" radius={[0, 4, 4, 0]} maxBarWidth={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card variant="outlined" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              빠른 작업
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start gap-3" onClick={() => window.location.href = '/admin/users'}>
              <Users className="w-5 h-5" />
              <span>사용자 관리</span>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3" onClick={() => window.location.href = '/admin/revenue'}>
              <DollarSign className="w-5 h-5" />
              <span>수익 상세 분석</span>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3" onClick={() => window.location.href = '/admin/generations'}>
              <Activity className="w-5 h-5" />
              <span>생성 모니터링</span>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3" onClick={() => window.location.href = '/admin/moderation'}>
              <AlertCircle className="w-5 h-5" />
              <span>콘텐츠 모더레이션</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Generations */}
        <Card variant="outlined" padding="md">
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center justify-between">
              <span>최근 생성 현황</span>
              <Button variant="ghost" size="sm" onClick={() => window.location.href = '/admin/generations'}>
                전체 보기
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-medium text-slate-500">사용자</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-500">프롬프트</th>
                    <th className="text-center py-2 px-3 font-medium text-slate-500">상태</th>
                    <th className="text-center py-2 px-3 font-medium text-slate-500">크레딧</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-500">시간</th>
                  </tr>
                </thead>
                <tbody>
                  {recentGenerations.slice(0, 5).map((gen) => (
                    <tr key={gen.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900">{gen.user?.name || '익명'}</div>
                        <div className="text-slate-500">{gen.user?.email}</div>
                      </td>
                      <td className="py-3 px-3 max-w-xs truncate text-slate-700">{gen.prompt?.slice(0, 40)}...</td>
                      <td className="py-3 px-3 text-center">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          gen.status === 'COMPLETED' && 'bg-emerald-100 text-emerald-700',
                          gen.status === 'PROCESSING' && 'bg-blue-100 text-blue-700',
                          gen.status === 'PENDING' && 'bg-amber-100 text-amber-700',
                          gen.status === 'FAILED' && 'bg-red-100 text-red-700'
                        )}>
                          {gen.status === 'COMPLETED' && '완료'}
                          {gen.status === 'PROCESSING' && '처리중'}
                          {gen.status === 'PENDING' && '대기'}
                          {gen.status === 'FAILED' && '실패'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-medium text-primary-600">{gen.creditsUsed}</td>
                      <td className="py-3 px-3 text-right text-slate-500">
                        {format(new Date(gen.createdAt), 'M/d HH:mm', { locale: ko })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card variant="outlined" padding="md">
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center justify-between">
              <span>최근 가입 사용자</span>
              <Button variant="ghost" size="sm" onClick={() => window.location.href = '/admin/users'}>
                전체 보기
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-medium text-slate-500">사용자</th>
                    <th className="text-center py-2 px-3 font-medium text-slate-500">역할</th>
                    <th className="text-center py-2 px-3 font-medium text-slate-500">크레딧</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-500">가입일</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.slice(0, 5).map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900">{user.name || '익명'}</div>
                        <div className="text-slate-500">{user.email}</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          user.role === 'ADMIN' && 'bg-red-100 text-red-700',
                          user.role === 'CREATOR' && 'bg-purple-100 text-purple-700',
                          user.role === 'USER' && 'bg-slate-100 text-slate-700'
                        )}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-medium text-primary-600">{formatNumber(user.credits)}</td>
                      <td className="py-3 px-3 text-right text-slate-500">
                        {format(new Date(user.createdAt), 'M/d', { locale: ko })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}