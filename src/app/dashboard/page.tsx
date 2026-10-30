'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Zap, Heart, History, Settings, Plus, ArrowRight, CreditCard, Crown } from 'lucide-react';

const PLANS = [
  { name: 'FREE', price: 0, credits: 10, features: ['기본 프롬프트 생성', '일일 3회 무료 생성', '기본 스타일 6종', '커뮤니티 지원'], color: 'slate' },
  { name: 'STARTER', price: 9900, credits: 100, features: ['월 100 크레딧', '모든 스타일 이용', '우선 생성 큐', '이메일 지원'], color: 'blue', popular: false },
  { name: 'PRO', price: 29900, credits: 500, features: ['월 500 크레딧', '고해상도 다운로드', '최우선 생성 큐', '전용 지원', '상업용 라이선스'], color: 'purple', popular: true },
  { name: 'ENTERPRISE', price: 99900, credits: 2000, features: ['월 2000 크레딧', 'API 접근', '전담 매니저', '커스텀 모델', 'SLA 보장'], color: 'amber', popular: false },
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const credits = user ? (user as any).credits ?? 0 : 0;
  const role = user ? (user as any).role : 'GUEST';

  const getPlanColor = (color: string) => {
    const colors: Record<string, string> = {
      slate: 'bg-slate-100 text-slate-700 border-slate-200',
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
      amber: 'bg-amber-50 text-amber-700 border-amber-200',
    };
    return colors[color] || colors.slate;
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="container-main">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">대시보드</h1>
            <p className="text-slate-600 mt-1">안녕하세요, {user?.name || '사용자'}님! 이모티콘 제작 현황을 확인하세요.</p>
          </div>
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${role === 'ADMIN' ? 'bg-red-100 text-red-700' : role === 'CREATOR' ? 'bg-purple-100 text-purple-700' : 'bg-primary-100 text-primary-700'}`}>
              {role === 'ADMIN' ? '관리자' : role === 'CREATOR' ? '크리에이터' : '일반'}
            </span>
            <Link href="/dashboard/credits">
              <Button variant="outline" size="sm">
                <CreditCard className="w-4 h-4 mr-1" />
                크레딧 충전
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card variant="elevated" padding="md">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">보유 크레딧</p>
                <p className="text-3xl font-bold text-slate-900">{credits}개</p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-primary-100 flex items-center justify-center">
                <Zap className="w-7 h-7 text-primary-600" />
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" padding="md">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">이번 달 생성</p>
                <p className="text-3xl font-bold text-slate-900">0건</p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Heart className="w-7 h-7 text-emerald-600" />
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" padding="md">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">저장된 캐릭터</p>
                <p className="text-3xl font-bold text-slate-900">0개</p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center">
                <Plus className="w-7 h-7 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" padding="md">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">즐겨찾기</p>
                <p className="text-3xl font-bold text-slate-900">0개</p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center">
                <Crown className="w-7 h-7 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <Link href="/" className="block">
            <Card variant="outlined" padding="lg" className="h-full hover:border-primary-300 transition-colors group">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mb-4 group-hover:bg-primary-200 transition-colors">
                  <Plus className="w-6 h-6 text-primary-600" />
                </div>
                <CardTitle>새 이모티콘 만들기</CardTitle>
                <CardDescription>캐릭터와 감정을 설정하고 AI 프롬프트 생성</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button variant="primary" size="sm" className="w-full">
                  시작하기 <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardFooter>
            </Card>
          </Link>

          <Link href="/dashboard/history" className="block">
            <Card variant="outlined" padding="lg" className="h-full hover:border-primary-300 transition-colors group">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-4 group-hover:bg-emerald-200 transition-colors">
                  <History className="w-6 h-6 text-emerald-600" />
                </div>
                <CardTitle>생성 히스토리</CardTitle>
                <CardDescription>이전에 만든 프롬프트와 결과 확인</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full">
                  기록 보기 <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardFooter>
            </Card>
          </Link>

          <Link href="/dashboard/settings" className="block">
            <Card variant="outlined" padding="lg" className="h-full hover:border-primary-300 transition-colors group">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4 group-hover:bg-slate-200 transition-colors">
                  <Settings className="w-6 h-6 text-slate-600" />
                </div>
                <CardTitle>계정 설정</CardTitle>
                <CardDescription>프로필, 알림, 보안 설정 관리</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button variant="ghost" size="sm" className="w-full">
                  설정하기 <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardFooter>
            </Card>
          </Link>
        </div>

        {/* Pricing Plans */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900">요금제 비교</h2>
            <p className="text-slate-600">필요에 맞는 플랜을 선택하세요. 언제든 변경 가능합니다.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan) => (
              <Card
                key={plan.name}
                variant={plan.popular ? 'elevated' : 'outlined'}
                padding="lg"
                className={`relative ${plan.popular ? 'border-2 border-primary-500 shadow-xl shadow-primary-500/10' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full">인기</span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-4xl font-bold text-slate-900">{plan.price.toLocaleString()}</span>
                    <span className="text-slate-500">/월</span>
                  </div>
                  <p className="mt-2 text-sm" style={{ color: plan.color }}>
                    월 {plan.credits.toLocaleString()} 크레딧 제공
                  </p>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.popular ? 'primary' : 'outline'}
                  className="w-full"
                  onClick={() => alert(`${plan.name} 플랜 구독 준비 중입니다.`)}
                >
                  {plan.price === 0 ? '무료로 시작' : plan.name === 'ENTERPRISE' ? '문의하기' : '구독하기'}
                </Button>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}