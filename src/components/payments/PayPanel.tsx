'use client';

import { useEffect, useRef, useState } from 'react';
import type { TossPaymentsWidgets, WidgetAgreementWidget, WidgetPaymentMethodWidget } from '@tosspayments/tosspayments-sdk';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { won } from '@/lib/pricing';

export function PayPanel({ orderId, amount, title, credits, provider, clientKey, available }: {
  orderId: string; amount: number; title: string; credits: number; provider: string; clientKey: string; available: boolean;
}) {
  const router = useRouter();
  const [agree, setAgree] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);
  const methodRef = useRef<WidgetPaymentMethodWidget | null>(null);

  useEffect(() => {
    if (!available || provider !== 'toss') return;
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
  }, [amount, available, clientKey, provider]);

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
      if (provider === 'toss' && widgetsRef.current) {
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
    {available && provider === 'toss' ? <><div id="payment-method" className="mt-4" /><div id="payment-agreement" /><p className="mt-2 text-xs text-sub">현재 카드 기반 결제만 지원합니다. 결제수단은 계약 및 설정에 따라 다를 수 있습니다.</p></> : null}
    {available && provider === 'mock' ? <p className="mt-4 text-xs font-bold text-sub">개발용 모의 결제입니다. 실제 결제는 발생하지 않습니다.</p> : null}
    <label className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-cream px-3 py-3 text-[11px] leading-relaxed text-sub">
      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-coral" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
      <span><strong>[필수]</strong> 디지털 콘텐츠의 사용이 시작된 부분은 법령에 따라 청약철회가 제한될 수 있습니다. 가분적인 미사용 부분과 법령상 권리는 별도로 적용됩니다. <Link href="/refund" target="_blank" className="font-bold text-coralink underline">환불·청약철회 안내</Link>를 확인했습니다.</span>
    </label>
    {error ? <p role="alert" className="mt-3 rounded-lg border-2 border-coral/50 bg-coral/10 p-3 text-xs font-bold text-coralink">{error}</p> : null}
    <button className="btn-primary mt-4 w-full !py-4" disabled={!available || !agree || busy || (provider === 'toss' && !ready)} onClick={pay}>{busy ? '결제 처리 중…' : `${won(amount)}원 결제하기`}</button>
    <p className="mt-3 text-center text-[10px] text-sub">승인 완료 시 {credits}크레딧이 지급됩니다.</p>
  </div>;
}
