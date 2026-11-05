'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function PaymentOrderAction({ orderId, hasPaymentKey }: { orderId: string; hasPaymentKey: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  if (!hasPaymentKey) {
    return <Link href={`/checkout/${orderId}`} className="mt-1 inline-block text-[11px] font-black text-coralink underline">결제 계속</Link>;
  }

  async function recover() {
    if (busy) return;
    setBusy(true); setFailed(false); setMessage('토스 승인 결과를 확인하고 있어요.');
    try {
      const res = await fetch('/api/checkout/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message || '승인 결과를 확인하지 못했어요.');
      setMessage(json.alreadyPaid ? '이미 지급이 완료된 주문입니다.' : '결제와 크레딧 지급을 복구했어요.');
      router.refresh();
    } catch (error) {
      setFailed(true);
      setMessage((error as Error).message || '승인 결과를 확인하지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="mt-1 block">
      <button type="button" disabled={busy} onClick={recover} className="text-[11px] font-black text-coralink underline disabled:opacity-50">
        {busy ? '확인 중…' : '승인 결과 확인'}
      </button>
      {message ? <span role="status" className={`ml-2 text-[10px] ${failed ? 'text-coralink' : 'text-sub'}`}>{message}</span> : null}
    </span>
  );
}
