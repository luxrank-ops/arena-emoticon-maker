'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type Payload = { orderId: string; paymentKey: string; amount: number };
const KEY = 'emotime:pending-payment';
export function PaymentSuccess() {
  const started = useRef(false);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('결제 승인을 확인하고 있어요.');
  const confirm = useCallback(async (data: Payload) => {
    setState('loading'); setMessage('결제 승인을 확인하고 있어요.');
    try {
      const res = await fetch('/api/checkout/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || '결제를 확인하지 못했어요.');
      try { sessionStorage.removeItem(KEY); } catch { /* 저장소를 사용하지 못해도 결제는 완료됐다 */ }
      setState('success'); setMessage('결제가 완료되고 크레딧이 지급되었습니다.');
    } catch (e) { setState('error'); setMessage((e as Error).message || '결제를 확인하지 못했어요.'); }
  }, []);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    const key = params.get('paymentKey'); const id = params.get('orderId'); const rawAmount = params.get('amount');
    let data: Payload | null = null;
    if (key && id && rawAmount && /^\d+$/.test(rawAmount)) {
      data = { orderId: id, paymentKey: key, amount: Number(rawAmount) };
      try { sessionStorage.setItem(KEY, JSON.stringify(data)); } catch { /* 현재 페이지에서 재시도 가능 */ }
      window.history.replaceState(null, '', '/checkout/success');
    } else {
      try { data = JSON.parse(sessionStorage.getItem(KEY) || 'null') as Payload | null; } catch { /* 무시 */ }
    }
    if (!data) { setState('error'); setMessage('결제 정보가 없습니다. 결제 내역을 확인해 주세요.'); return; }
    setPayload(data); void confirm(data);
  }, [confirm]);
  return <div className="wrap max-w-xl py-16"><div className="card p-6">
    <h1 className="h2">{state === 'success' ? '결제 완료' : state === 'error' ? '결제 확인 필요' : '결제 확인 중'}</h1>
    <p role="status" className="mt-4 text-sm text-sub">{message}</p>
    {state === 'error' && payload ? <><p className="mt-2 text-xs text-sub">주문번호: {payload.orderId} · 중복 결제를 하지 말고 다시 확인해 주세요.</p><button className="btn-primary mt-4" onClick={() => void confirm(payload)}>승인 결과 다시 확인</button></> : null}
    <div className="mt-5 flex gap-2"><Link className="btn-ghost" href="/billing">결제 내역</Link><Link className="btn-ghost" href="/support">고객센터</Link></div>
  </div></div>;
}
