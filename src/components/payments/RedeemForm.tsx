'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type CatalogItem = { sku: string; title: string; price: number; kind: string; credits: number; desc: string };
type HistoryRow = { label: string; sku: string; at: string; orderId: string };
type StatusView = { state: string; label: string; remaining: number; quantity: number; expiresAt?: string };

const STATE_TEXT: Record<string, string> = {
  active: '사용 가능한 코드예요.',
  used: '이미 사용된 코드예요.',
  revoked: '사용이 중지된 코드예요.',
  disabled: '아직 활성화되지 않은 코드예요.',
  expired: '유효기간이 지난 코드예요.',
  scheduled: '아직 시작일 전이에요.',
};

const inputClass =
  'w-full rounded-xl border border-line bg-white px-4 py-3 text-base tracking-[0.18em] outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10';

export function RedeemForm({ initialCredits }: { initialCredits: number }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null);
  const [status, setStatus] = useState<StatusView | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [credits, setCredits] = useState(initialCredits);

  useEffect(() => {
    void fetch('/api/redeem')
      .then((res) => res.json())
      .then((json) => setCatalog(json?.skus ?? []))
      .catch(() => undefined);
    void fetch('/api/redeem/status')
      .then((res) => res.json())
      .then((json) => setHistory(json?.history ?? []))
      .catch(() => undefined);
  }, []);

  async function check() {
    if (busy || !code.trim()) return;
    setBusy(true);
    setMessage(null);
    setStatus(null);
    try {
      const res = await fetch('/api/redeem/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '코드를 확인하지 못했어요.');
      setStatus(json as StatusView);
    } catch (e) {
      setMessage({ tone: 'bad', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function redeem() {
    if (busy || !code.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '코드를 사용하지 못했어요.');
      setCredits(json.balance ?? credits);
      setMessage({
        tone: 'good',
        text:
          json.kind === 'unlock'
            ? '잠금이 풀렸어요! 이제 고화질·투명 PNG와 ZIP을 내려받을 수 있어요.'
            : json.kind === 'subscription'
              ? 'Creator Pro 1개월 이용권이 시작됐어요.'
              : `${json.credits}크레딧이 들어왔어요.`,
      });
      setStatus(null);
      setCode('');
      void fetch('/api/redeem/status')
        .then((r) => r.json())
        .then((j) => setHistory(j?.history ?? []))
        .catch(() => undefined);
      router.refresh();
    } catch (e) {
      setMessage({ tone: 'bad', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="card p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-black">교환권 코드 입력</p>
          <span className="chip !bg-cream">보유 크레딧 {credits}</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-sub">
          구입처에서 받은 32자리 코드를 입력하세요. 하이픈·공백은 있어도 되고, 대소문자·O/0 혼동도 자동으로 맞춰 드려요.
        </p>
        <label htmlFor="redeem-code" className="mt-4 block text-[11px] font-black text-sub">
          코드
        </label>
        <input
          id="redeem-code"
          className={`${inputClass} mt-1`}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void (status ? redeem() : check());
          }}
          placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={80}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn-primary !px-5 !py-3" onClick={() => void redeem()} disabled={busy || !code.trim()}>
            {busy ? '처리 중…' : '코드 사용하기'}
          </button>
          <button type="button" className="btn-ghost !px-5 !py-3" onClick={() => void check()} disabled={busy || !code.trim()}>
            사용 전 확인
          </button>
        </div>

        {status ? (
          <div className="mt-4 rounded-xl border border-line bg-cream p-4 text-xs leading-relaxed">
            <p className="font-black text-ink">{status.label}</p>
            <p className={`mt-1 font-bold ${status.state === 'active' ? 'text-mint' : 'text-coralink'}`}>
              {STATE_TEXT[status.state] ?? status.state}
            </p>
            <p className="mt-1 text-sub">
              지급 {status.quantity}회 · 남은 {status.remaining}회
              {status.expiresAt ? ` · ${new Date(status.expiresAt).toLocaleDateString('ko-KR')}까지` : ''}
            </p>
          </div>
        ) : null}

        {message ? (
          <p
            role={message.tone === 'bad' ? 'alert' : 'status'}
            className={`mt-4 rounded-xl border-2 p-3 text-xs font-bold ${
              message.tone === 'good' ? 'border-mint/40 bg-mint/10 text-ink' : 'border-coral/50 bg-coral/10 text-coralink'
            }`}
          >
            {message.text}
          </p>
        ) : null}

        {message?.tone === 'good' ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/studio/packs" className="btn-dark !px-4 !py-2 text-xs">
              내 팩 보기
            </Link>
            <Link href="/billing" className="btn-ghost !px-4 !py-2 text-xs">
              크레딧 · 결제 내역
            </Link>
          </div>
        ) : null}

        {history.length > 0 ? (
          <div className="mt-6 border-t border-line pt-4">
            <p className="text-xs font-black">내 교환 이력</p>
            <ul className="mt-2 space-y-1.5 text-[11px] text-sub">
              {history.map((row) => (
                <li key={row.orderId} className="flex items-center justify-between gap-2">
                  <span className="font-bold text-ink">{row.label}</span>
                  <span>{new Date(row.at).toLocaleString('ko-KR')}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="card p-5">
          <p className="text-sm font-black">교환권으로 열 수 있는 것</p>
          <ul className="mt-3 space-y-2">
            {catalog.map((item) => (
              <li key={item.sku} className="rounded-xl border border-line bg-white px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-black text-ink">{item.title}</span>
                  <span className="text-[11px] font-bold text-sub">정가 {item.price.toLocaleString('ko-KR')}원</span>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-sub">{item.desc}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] leading-relaxed text-sub">
            교환권은 카드 결제 대신 코드로 상품을 받는 방식이에요. 결제·환불은 코드를 구입한 곳(운영자·판매처)의 안내를 따릅니다.
          </p>
        </div>

        <div className="card p-5">
          <p className="text-sm font-black">코드가 없으신가요?</p>
          <p className="mt-1 text-[11px] leading-relaxed text-sub">
            무료 체험으로 12컷 팩을 먼저 만들어 볼 수 있어요. 마음에 들면 완성권으로 잠금을 풀면 됩니다.
          </p>
          <Link href="/studio/upload" className="btn-ghost mt-3 block w-full text-center !py-2.5 text-xs">
            12컷 미리보기 시작
          </Link>
          <Link href="/support" className="mt-2 block text-center text-[11px] font-bold text-coralink underline">
            구입·사용 문의
          </Link>
        </div>
      </div>
    </div>
  );
}
