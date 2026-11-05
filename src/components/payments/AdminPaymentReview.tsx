'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { PaymentReviewItem } from '@/lib/payment-review';

export function AdminPaymentReview({ items }: { items: PaymentReviewItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

  async function recover(orderId: string) {
    if (busyId) return;
    setBusyId(orderId);
    setMessages((current) => ({ ...current, [orderId]: '승인 결과를 다시 확인하고 있어요.' }));
    try {
      const res = await fetch('/api/admin/payments/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message || '복구하지 못했어요.');
      setMessages((current) => ({ ...current, [orderId]: json.alreadyPaid ? '이미 지급된 주문입니다.' : '승인된 결제를 복구했어요.' }));
      router.refresh();
    } catch (error) {
      setMessages((current) => ({ ...current, [orderId]: (error as Error).message }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-black">결제 대사 점검</p>
        <span className={`chip ${items.length ? '!bg-coral/10 !text-coralink' : '!bg-mint/30'}`}>{items.length}건</span>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-[11px] leading-relaxed text-sub">승인 후 미지급 의심 주문과 크레딧 원장 불일치가 없습니다.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((item) => (
            <li key={`${item.orderId}-${item.issue}`} className="rounded-xl border border-line bg-cream p-3">
              <p className="text-xs font-black">{item.title} · {item.amount.toLocaleString('ko-KR')}원</p>
              <p className="mt-0.5 break-all text-[10px] text-sub">{item.orderId}</p>
              <p className="mt-1 text-[11px] font-bold text-coralink">{item.issue === 'APPROVAL_UNSETTLED' ? '승인 시도 후 미지급' : 'PAID 주문과 크레딧 원장 불일치'}</p>
              {item.canRecover ? (
                <button type="button" disabled={busyId !== null} onClick={() => void recover(item.orderId)} className="btn-ghost mt-2 !px-3 !py-1.5 text-[11px] disabled:opacity-50">
                  {busyId === item.orderId ? '확인 중…' : '토스 승인 결과로 복구'}
                </button>
              ) : <p className="mt-2 text-[10px] font-bold text-sub">자동 복구하지 말고 토스 거래와 원장을 수동 대조하세요.</p>}
              {messages[item.orderId] ? <p role="status" className="mt-2 text-[10px] leading-relaxed text-sub">{messages[item.orderId]}</p> : null}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[10px] leading-relaxed text-sub">방금 시작한 결제는 진행 중일 수 있습니다. 잠시 후 확인하고, 복구 전 토스 상점관리자의 주문번호·금액·상태를 대조하세요.</p>
    </div>
  );
}
