'use client';

import { useEffect, useRef, useState } from 'react';
import type { TossPaymentsWidgets, WidgetAgreementWidget, WidgetPaymentMethodWidget } from '@tosspayments/tosspayments-sdk';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { won } from '@/lib/pricing';
import { isTWA } from '@/lib/twa';

type PortOnePaymentResult = { code?: string; message?: string; paymentId?: string };
type PortOneCustomer = { email?: string; fullName?: string; phoneNumber?: string };
type PortOneRequestPayment = (options: {
  storeId: string; channelKey: string; paymentId: string; orderName: string;
  totalAmount: number; currency: 'KRW'; payMethod: 'CARD'; customer?: PortOneCustomer;
}) => Promise<PortOnePaymentResult>;

/** 포트원 브라우저 SDK는 결제할 때만 CDN에서 불러온다(의존성·번들 추가 없이). */
async function loadPortOneRequestPayment(): Promise<PortOneRequestPayment> {
  const read = () => (window as unknown as { PortOne?: { requestPayment?: PortOneRequestPayment } }).PortOne;
  if (read()?.requestPayment) return read()!.requestPayment!;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.portone.io/v2/browser-sdk.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('결제 모듈을 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.'));
    document.head.appendChild(script);
  });
  const loaded = read();
  if (!loaded?.requestPayment) throw new Error('결제 모듈을 불러오지 못했어요.');
  return loaded.requestPayment;
}

export function PayPanel({ orderId, amount, title, credits, provider, clientKey, available, kind, storeId = '', channelKey = '', buyerEmail = '', buyerName = '' }: {
  orderId: string; amount: number; title: string; credits: number; provider: string; clientKey: string; available: boolean; kind: 'subscription' | 'credits' | 'goods' | 'unlock'; storeId?: string; channelKey?: string; buyerEmail?: string; buyerName?: string;
}) {
  const router = useRouter();
  const [agree, setAgree] = useState(false);
  // KG이니시스 V2는 구매자 이메일이 필수 — 회원은 가입 이메일을 기본값으로, 비회원은 직접 입력받는다.
  const [email, setEmail] = useState(buyerEmail);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // TWA 감지는 마운트 후에만 (SSR/클라이언트 혼성 렌더 방지)
  const [inTWA, setInTWA] = useState(false);
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);
  const methodRef = useRef<WidgetPaymentMethodWidget | null>(null);

  useEffect(() => {
    // TWA 여부는 브라우저에서만 알 수 있어 마운트 후에 반영한다(SSR 값으로 넣으면 하이드레이션이 어긋난다).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 브라우저 전용 API 결과를 마운트 후 반영
    setInTWA(isTWA());
  }, []);

  // 구글 플레이 인앱결제 정책: TWA 안에서는 디지털 상품(크레딧) 결제를 제공하지 않는다.
  // (물리 굿즈는 웹 결제 허용 — goods 는 그대로)
  const twaCreditBlocked = inTWA && kind !== 'goods';

  useEffect(() => {
    if (!available || provider !== 'toss' || twaCreditBlocked) return;
    let cancelled = false;
    let method: WidgetPaymentMethodWidget | undefined;
    let agreement: WidgetAgreementWidget | undefined;
    (async () => {
      const { loadTossPayments, ANONYMOUS } = await import('@tosspayments/tosspayments-sdk');
      const toss = await loadTossPayments(clientKey);
      if (cancelled) return;
      const widgets = toss.widgets({ customerKey: ANONYMOUS });
      await widgets.setAmount({ currency: 'KRW', value: amount });
      if (cancelled) return;
      method = await widgets.renderPaymentMethods({ selector: '#payment-method' });
      if (cancelled) { await method.destroy(); return; }
      agreement = await widgets.renderAgreement({ selector: '#payment-agreement' });
      if (cancelled) { await method.destroy(); await agreement.destroy(); return; }
      widgetsRef.current = widgets; methodRef.current = method; setReady(true);
    })().catch(() => { if (!cancelled) setError('결제창을 불러오지 못했어요. 새로고침하거나 고객센터에 문의해 주세요.'); });
    return () => { cancelled = true; widgetsRef.current = null; methodRef.current = null; if (method) void method.destroy().catch(() => {}); if (agreement) void agreement.destroy().catch(() => {}); };
  }, [amount, available, clientKey, provider, twaCreditBlocked]);

  async function pay() {
    if (!agree || !available || busy) return;
    setBusy(true); setError(null);
    try {
      if (provider === 'toss') {
        if (!widgetsRef.current || !methodRef.current) throw new Error('결제창을 불러오는 중입니다.');
        const method = await methodRef.current.getSelectedPaymentMethod();
        if (method.method !== 'CARD') throw new Error('현재 카드 기반 결제만 지원합니다. 카드 결제를 선택해 주세요.');
      }
      const prepared = await fetch('/api/checkout/prepare', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, agreeDigital: true }) });
      const json = await prepared.json();
      if (!prepared.ok) throw new Error(json?.error?.message || '결제 준비에 실패했어요.');
      if (provider === 'portone') {
        if (!storeId || !channelKey) throw new Error('결제 설정이 아직 준비되지 않았어요. 고객센터에 문의해 주세요.');
        const customerEmail = (email || buyerEmail).trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) throw new Error('결제에 필요한 이메일 주소를 정확히 입력해 주세요.');
        // 포트원은 결제 시도마다 고유한 paymentId를 요구하므로 주문번호에 시각을 붙인다.
        const paymentId = `${orderId}-${Date.now().toString(36)}`;
        const requestPayment = await loadPortOneRequestPayment();
        const result = await requestPayment({
          storeId,
          channelKey,
          paymentId,
          orderName: title,
          totalAmount: amount,
          currency: 'KRW',
          payMethod: 'CARD',
          customer: { email: customerEmail, ...(buyerName ? { fullName: buyerName } : {}) },
        });
        if (!result || result.code) throw new Error(result?.message || '결제가 완료되지 않았어요.');
        const confirmed = await fetch('/api/checkout/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, amount, paymentKey: paymentId }) });
        const data = await confirmed.json();
        if (!confirmed.ok) throw new Error(data?.error?.message || '결제 승인을 확인하지 못했어요. 고객센터에 문의해 주세요.');
        router.push('/billing'); router.refresh();
      } else if (provider === 'toss' && widgetsRef.current) {
        await widgetsRef.current.requestPayment({ orderId, orderName: title, successUrl: `${window.location.origin}/checkout/success`, failUrl: `${window.location.origin}/checkout/fail` });
      } else if (provider === 'mock') {
        const res = await fetch('/api/checkout/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, amount, paymentKey: `mock_${orderId}` }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || '테스트 결제에 실패했어요.');
        router.push('/billing'); router.refresh();
      }
    } catch (e) { setError((e as Error).message || '결제를 시작하지 못했어요.'); setBusy(false); }
  }

  return <div className="card p-6">
    <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
      <div><p className="text-sm font-black">{title}</p><p className="mt-0.5 text-xs text-sub">주문번호 {orderId}</p></div>
      <p className="text-xl font-black">{won(amount)}원</p>
    </div>
    {!available ? <p role="status" className="mt-4 text-sm font-bold text-coralink">결제를 진행할 수 없는 주문입니다. 결제 내역을 확인하거나 고객센터에 문의해 주세요.</p> : null}
    {available && provider === 'toss' && !twaCreditBlocked ? <><div id="payment-method" className="mt-4" /><div id="payment-agreement" /><p className="mt-2 text-xs text-sub">현재 카드 기반 결제만 지원합니다. 결제수단은 계약 및 설정에 따라 다를 수 있습니다.</p></> : null}
    {available && provider === 'portone' && !twaCreditBlocked ? <p className="mt-4 text-xs text-sub">KG이니시스 결제창에서 신용·체크카드로 결제합니다. 결제수단은 계약 및 설정에 따라 다를 수 있습니다.</p> : null}
    {available && provider === 'portone' && !twaCreditBlocked && !buyerEmail ? <label className="mt-3 block text-[11px] font-bold text-sub">결제 확인용 이메일 (필수)
      <input type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-medium text-ink" />
      <span className="mt-1 block font-normal leading-relaxed">결제 영수증·안내를 받을 이메일이에요. 이모티학에 저장하지 않습니다.</span>
    </label> : null}
    {available && provider === 'mock' ? <p className="mt-4 text-xs font-bold text-sub">개발용 모의 결제입니다. 실제 결제는 발생하지 않습니다.</p> : null}
    {twaCreditBlocked ? <div className="mt-4 rounded-xl border border-line bg-cream p-4">
      <p className="text-sm font-black">이미 모든 기능이 포함되어 있어요</p>
      <p className="mt-1 text-xs leading-relaxed text-sub">구글 플레이에서 구매한 유료 앱 사용자는 크레딧 구매 없이 모든 스타일·모든 기능을 이용할 수 있습니다. 앱 구매로 결제가 이미 완료되어 추가 결제는 필요 없어요.</p>
      <Link href="/studio/upload" className="btn-primary mt-3 block w-full !py-4">팩 만들기</Link>
    </div> : <><label className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-cream px-3 py-3 text-[11px] leading-relaxed text-sub">
      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-coral" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
      <span><strong>[필수]</strong> {kind === 'goods' ? '개별 제작 상품의 단순 변심에 의한 취소는 법령상 요건을 충족할 때 제한될 수 있습니다. 하자·오배송과 법령상 권리는 별도로 적용됩니다.' : '디지털 콘텐츠의 사용이 시작된 부분은 법령에 따라 청약철회가 제한될 수 있습니다. 가분적인 미사용 부분과 법령상 권리는 별도로 적용됩니다.'} <Link href="/refund" target="_blank" className="font-bold text-coralink underline">환불·청약철회 안내</Link>를 확인했습니다.</span>
    </label>
    {error ? <p role="alert" className="mt-3 rounded-lg border-2 border-coral/50 bg-coral/10 p-3 text-xs font-bold text-coralink">{error}</p> : null}
    <button className="btn-primary mt-4 w-full !py-4" disabled={!available || !agree || busy || (provider === 'toss' && !ready)} onClick={pay}>{busy ? '결제 처리 중…' : `${won(amount)}원 결제하기`}</button>
    <p className="mt-3 text-center text-[10px] text-sub">{kind === 'goods' ? '승인 완료 후 운영자가 주문을 확인합니다.' : kind === 'unlock' ? '승인 완료 시 팩 잠금이 해제되고 고화질·ZIP 내보내기가 열립니다.' : kind === 'subscription' ? '승인 완료 시 Creator Pro 1개월 이용권이 시작됩니다.' : `승인 완료 시 ${credits}크레딧이 지급됩니다.`}</p></>}
  </div>;
}
