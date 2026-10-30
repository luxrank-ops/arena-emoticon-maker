"use client";

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { CreditCard, Zap, ArrowRight, CheckCircle, Clock, AlertCircle, Shield } from 'lucide-react';
import TossPaymentWidget from '@/components/payments/TossPaymentWidget';

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

type PaymentProvider = 'stripe' | 'toss';

type TossPaymentWidgetState = { 
  packageId: string; 
  isSubscription: boolean; 
  provider: PaymentProvider;
  orderId: string;
};

export default function CreditsPage() {
  const { data: session, update } = useSession();
  const credits = session?.user ? (session.user as any).credits ?? 0 : 0;
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('toss'); // 기본 토스
  const [showPaymentWidget, setShowPaymentWidget] = useState<TossPaymentWidgetState | null>(null);

  const handlePurchase = async (packageId: string, isSubscription = false) => {
    try {
      if (paymentProvider === 'toss') {
        alert('토스 결제는 안전성 검증이 완료될 때까지 사용할 수 없습니다.');
        return;
      } else {
        // 스트라이프: 기존 리다이렉트 방식
        const response = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packageId, isSubscription }),
        });
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        } else if (data.orderId) {
          // 토스 결제 위젯용 데이터인 경우
          setShowPaymentWidget({ packageId, isSubscription, provider: 'toss', orderId: data.orderId });
        }
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('결제 페이지 이동 중 오류가 발생했습니다.');
    }
  };

  const handleTossPaymentSuccess = async (data: { paymentKey: string; orderId: string; amount: number }) => {
    // 결제 성공 시 세션 업데이트 (크레딧 반영)
    try {
      await update();
    } catch (e) {
      console.error('Session update failed:', e);
    }
    setShowPaymentWidget(null);
    alert('결제가 완료되었습니다! 크레딧이 충전되었습니다.');
    // 페이지 새로고침으로 최신 크레딧 반영
    window.location.reload();
  };

  const handleTossPaymentError = (error: { code: string; message: string }) => {
    console.error('Toss payment error:', error);
    if (error.code !== 'USER_CANCEL') {
      alert(`결제 실패: ${error.message}`);
    }
    setShowPaymentWidget(null);
  };

  const handleTossPaymentClose = () => {
    setShowPaymentWidget(null);
  };

  // 결제 공급자 선택 컴포넌트
  const renderProviderSelector = () => (
    <div className="mb-6 p-4 bg-slate-50 rounded-xl">
      <p className="text-sm font-medium text-slate-900 mb-3">결제 수단 선택</p>
      <div className="flex gap-4">
        <button
          onClick={() => setPaymentProvider('toss')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
            paymentProvider === 'toss'
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          <Shield className="w-5 h-5" />
          <span className="font-medium">토스페이먼츠</span>
          <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">추천</span>
        </button>
        <button
          onClick={() => setPaymentProvider('stripe')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
            paymentProvider === 'stripe'
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span className="font-medium">Stripe</span>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">해외결제</span>
        </button>
      </div>
      <p className="text-xs text-slate-500 mt-2">
        토스페이먼츠: 국내 카드/간편결제(토스페이, 카카오페이, 네이버페이 등) 지원, 수수료 저렴
        <br />Stripe: 해외 카드 결제 지원, 구독 관리 기능 강력
      </p>
    </div>
  );

  // 토스 결제 위젯 모달
  const renderTossPaymentModal = () => {
    if (!showPaymentWidget) return null;

    const pkg = CREDIT_PACKAGES.find(p => p.id === showPaymentWidget.packageId);
    const sub = SUBSCRIPTION_PLANS.find(p => p.id === showPaymentWidget.packageId);
    const item = pkg || sub;
    const isSubscription = showPaymentWidget.isSubscription;

    if (!item) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              {isSubscription ? '구독 첫 결제' : '크레딧 충전'} - {item.name}
            </h3>
            <button
              onClick={handleTossPaymentClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-6">
            <TossPaymentWidget
              orderId={showPaymentWidget.orderId}
              amount={item.price}
              orderName={`${item.name}${isSubscription ? ' - 첫 결제' : ` - ${'credits' in item ? item.credits : item.monthlyCredits} 크레딧`}${'bonus' in item && item.bonus ? ` (+${item.bonus} 보너스)` : ''}`}
              customerEmail={session?.user?.email || undefined}
              customerName={session?.user?.name || undefined}
              metadata={{
                userId: (session?.user as any)?.id,
                packageId: showPaymentWidget.packageId,
                credits: (pkg?.credits || sub?.monthlyCredits || 0).toString(),
                type: isSubscription ? 'subscription' : 'credits',
                ...(isSubscription && { monthlyCredits: (sub?.monthlyCredits || 0).toString() }),
              }}
              onSuccess={handleTossPaymentSuccess}
              onError={handleTossPaymentError}
            />
          </div>
        </div>
      </div>
    );
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

        {/* 결제 공급자 선택 */}
        {renderProviderSelector()}

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
                  {paymentProvider === 'toss' ? '토스페이로 구매' : '구매하기'}
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
                  {paymentProvider === 'toss' ? '토스페이로 구독' : '구독 시작'}
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
              { icon: Shield, title: '전용 지원', desc: '우선 기술 지원 및 문의 응대', color: 'purple' },
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
              { q: '토스페이먼츠와 Stripe 중 뭐가 좋나요?', a: '국내 카드/간편결제 위주면 토스페이먼츠(수수료 저렴, 간편결제 지원), 해외 결제 필요하면 Stripe를 추천합니다. 언제든 변경 가능합니다.' },
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

        {/* 토스 결제 모달 */}
        {renderTossPaymentModal()}
      </div>
    </div>
  );
}