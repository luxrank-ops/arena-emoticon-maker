'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { won } from '@/lib/pricing';

export function PayPanel({
  orderId,
  amount,
  title,
  credits,
  provider,
}: {
  orderId: string;
  amount: number;
  title: string;
  credits: number;
  provider: string;
}) {
  const router = useRouter();
  const [agree, setAgree] = useState(false);
  const [method, setMethod] = useState<'card' | 'tosspay' | 'kakaopay'>('card');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      // 토스페이먼츠 연동 시: 결제위젯 v2 → successUrl → /api/checkout/confirm
      // 현재는 mock provider 로 동일한 confirm 파이프라인을 검증한다.
      const res = await fetch('/api/checkout/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amount,
          agreeDigital: true,
          paymentKey: `mock_${method}_${Date.now()}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '결제에 실패했습니다');
      setDone(true);
      setTimeout(() => {
        router.push('/billing');
        router.refresh();
      }, 1200);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border-2 border-ink bg-mint text-2xl">✓</div>
        <p className="mt-4 text-xl font-black">결제 완료</p>
        <p className="mt-1 text-sm text-sub">
          {credits}크레딧이 지급되었습니다. 잠시 후 마이페이지로 이동합니다.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="text-sm font-black">{title}</p>
          <p className="mt-0.5 text-xs text-sub">주문번호 {orderId}</p>
        </div>
        <p className="text-xl font-black">{won(amount)}원</p>
      </div>

      <div className="mt-4">
        <p className="text-xs font-black text-sub">결제 수단</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[
            { k: 'card' as const, l: '신용·체크카드' },
            { k: 'tosspay' as const, l: '토스페이' },
            { k: 'kakaopay' as const, l: '카카오페이' },
          ].map((m) => (
            <button
              key={m.k}
              onClick={() => setMethod(m.k)}
              className={`rounded-xl border-2 px-2 py-3 text-[11px] font-black transition ${
                method === m.k ? 'border-ink bg-lemon/40' : 'border-line bg-paper text-sub hover:border-ink'
              }`}
            >
              {m.l}
            </button>
          ))}
        </div>
      </div>

      <label className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-cream px-3 py-3 text-[11px] leading-relaxed">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-coral"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
        />
        <span>
          <strong>[필수]</strong> 디지털 콘텐츠(크레딧·구독)는 <strong>생성이 시작되면 청약철회가 제한</strong>됨을
          확인했으며, 이에 동의합니다. (전자상거래법 제17조 제2항)
        </span>
      </label>

      {error ? (
        <p className="mt-3 rounded-lg border-2 border-coral/50 bg-coral/10 px-3 py-2 text-xs font-bold text-coralink">
          {error}
        </p>
      ) : null}

      <button className="btn-primary mt-4 w-full !py-4" disabled={!agree || busy} onClick={pay}>
        {busy ? '결제 처리 중…' : `${won(amount)}원 결제하기`}
      </button>
      <p className="mt-3 text-center text-[10px] leading-relaxed text-sub">
        {provider === 'mock'
          ? '테스트 모드: 실제 결제가 발생하지 않습니다. 운영 시 토스페이먼츠 결제위젯으로 전환됩니다.'
          : '토스페이먼츠 보안 결제 · 결제 정보는 저장되지 않습니다'}
      </p>
    </div>
  );
}
