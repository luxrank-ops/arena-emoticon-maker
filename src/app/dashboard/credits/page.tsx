'use client';

import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { CreditCard, Zap, ArrowRight, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const CREDIT_PACKAGES = [
  { id: 'starter', name: '스타터 팩', credits: 100, price: 9900, bonus: 0, popular: false },
  { id: 'pro', name: '프로 팩', credits: 500, price: 39900, bonus: 50, popular: true },
  { id: 'business', name: '비즈니스 팩', credits: 1200, price: 79900, bonus: 200, popular: false },
  { id: 'enterprise', name: '엔터프라이즈', credits: 3000, price: 179000, bonus: 500, popular: false },
];

const SUBSCRIPTION_PLANS = [
  { id: 'monthly_starter', name: '월간 스타터', monthlyCredits: 100, price: 9900, features: ['매월 100 크레딧', '롤오버 미지원', '우선 생성'] },
  { id: 'monthly_pro', name: '월간 프로', monthlyCredits: 500, price: 29900, features: ['매월 500 크레딧', '롤오버 50% 지원', '최우선 생성', '고해상도 다운로드'] },
  { id: 'monthly_business', name: '월간 비즈니스', monthlyCredits: 1200, price: 69900, features: ['매월 1200 크레딧', '롤오버 100% 지원', '전용 지원', 'API 접근'] },
];

export default function CreditsPage() {
  const { data: session, update } = useSession();
  const credits = session?.user ? (session.user as any).credits ?? 0 : 0;

  const handlePurchase = async (packageId: string, isSubscription = false) => {
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId, isSubscription }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('결제 페이지 이동 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="container-main max-w-4xl">
        {/* Current Credits */}
        <Card variant="elevated" padding="lg" className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-6 h-6 text-amber-500" />
                  현재 보유 크레딧
                </CardTitle>
                <CardDescription>이모티콘 생성 1회당 1 크레딧이 소모됩니다.</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-slate-900">{credits.toLocaleString()}</p>
                <p className="text-sm text-slate-500">개 남음</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="w-full" onClick={() => handlePurchase('starter')}>
                <CreditCard className="w-4 h-4 mr-2" />
                크레딧 충전하기
              </Button>
              <Button variant="primary" className="w-full" onClick={() => handlePurchase('monthly_pro', true)}>
                <Zap className="w-4 h-4 mr-2" />
                구독으로 자동 충전
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => alert('무료 크레딧 획득 기능 준비 중입니다.')}>
                <ArrowRight className="w-4 h-4 mr-2" />
                무료 크레딧 얻기
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* One-time Packages */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">일회성 크레딧 팩</h2>
              <p className="text-slate-600">필요할 때마다 구매하세요. 만료일 없음.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {CREDIT_PACKAGES.map((pkg) => (
              <Card
                key={pkg.id}
                variant={pkg.popular ? 'elevated' : 'outlined'}
                padding="lg"
                className={`relative ${pkg.popular ? 'border-2 border-primary-500 shadow-xl shadow-primary-500/10' : ''}`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full">추천</span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-slate-900">{pkg.name}</h3>
                  <div className="mt-2">
                    <span className="text-4xl font-bold text-slate-900">{pkg.price.toLocaleString()}</span>
                    <span className="text-slate-500">원</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-bold text-primary-600">{pkg.credits.toLocaleString()}</span>
                    <span className="text-slate-500 ml-1">크레딧</span>
                    {pkg.bonus > 0 && (
                      <span className="ml-2 text-sm text-emerald-600 font-medium">+{pkg.bonus} 보너스</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    1크레딧당 {Math.round(pkg.price / pkg.credits)}원
                    {pkg.bonus > 0 && ` (실제 ${Math.round(pkg.price / (pkg.credits + pkg.bonus))}원)`}
                  </p>
                </div>
                <Button
                  variant={pkg.popular ? 'primary' : 'outline'}
                  className="w-full"
                  size="lg"
                  onClick={() => handlePurchase(pkg.id)}
                >
                  구매하기
                </Button>
              </Card>
            ))}
          </div>
        </section>

        {/* Subscription Plans */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">월간 구독 플랜</h2>
              <p className="text-slate-600">매월 자동 충전으로 최대 20% 할인 혜택</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <Card variant="outlined" padding="lg" key={plan.id} className="relative">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-4xl font-bold text-slate-900">{plan.price.toLocaleString()}</span>
                    <span className="text-slate-500">/월</span>
                  </div>
                  <div className="mt-2 text-primary-600 font-medium">
                    매월 {plan.monthlyCredits.toLocaleString()} 크레딧 제공
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handlePurchase(plan.id, true)}
                >
                  구독 시작
                </Button>
              </Card>
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-slate-900 mb-6">구독 회원 전용 혜택</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Zap, title: '최우선 생성 큐', desc: '대기 시간 없이 즉시 생성', color: 'amber' },
              { icon: CheckCircle, title: '롤오버 크레딧', desc: '미사용 크레딧 다음 달 이월 (프로 이상)', color: 'emerald' },
              { icon: CreditCard, title: '자동 충전', desc: '크레딧 부족 걱정 없이 자동 갱신', color: 'blue' },
              { icon: AlertCircle, title: '전용 지원', desc: '우선 기술 지원 및 문의 응대', color: 'purple' },
              { icon: Clock, title: '고해상도 다운로드', desc: '4K 해상도 원본 파일 제공 (프로 이상)', color: 'indigo' },
              { icon: ArrowRight, title: 'API 접근', desc: '자동화 연동을 위한 REST API 키 (비즈니스)', color: 'rose' },
            ].map((benefit, idx) => (
              <Card key={idx} variant="outlined" padding="md" className="text-center">
                <div className={`w-12 h-12 rounded-xl bg-${benefit.color}-100 flex items-center justify-center mx-auto mb-3`}>
                  <benefit.icon className="w-6 h-6" style={{ color: `var(--${benefit.color}-600)` }} />
                </div>
                <h4 className="font-semibold text-slate-900 mb-1">{benefit.title}</h4>
                <p className="text-sm text-slate-600">{benefit.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-6">자주 묻는 질문</h2>
          <div className="space-y-4">
            {[
              { q: '크레딧은 언제 만료되나요?', a: '일회성 구매 크레딧은 만료일이 없습니다. 구독 플랜의 월간 크레딧은 해당 월 말에 소멸되며, 프로 이상 플랜은 미사용분의 50~100%가 다음 달로 이월됩니다.' },
              { q: '환불이 가능한가요?', a: '사용하지 않은 일회성 크레딧은 구매 후 7일 이내 전액 환불 가능합니다. 구독은 현재 월 이용분 제외하고 즉시 해지 및 환불 처리됩니다.' },
              { q: '세금계산서 발행되나요?', a: '네, 사업자 등록번호를 프로필에 등록하시면 자동으로 세금계산서가 발행됩니다. (부가가치세 10% 별도)' },
              { q: '팀/조직 단위 구매는 어떻게 하나요?', a: '엔터프라이즈 플랜 또는 별도 B2B 계약을 통해 팀 관리자 콘솔, 통합 청구, SSO 등을 제공합니다. 영업팀에 문의해주세요.' },
            ].map((faq, idx) => (
              <Card key={idx} variant="outlined" padding="md">
                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer list-none font-medium text-slate-900">
                    {faq.q}
                    <span className="text-primary-600 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </details>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}