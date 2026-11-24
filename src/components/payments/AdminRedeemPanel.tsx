'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type CatalogItem = { sku: string; title: string; price: number; kind: string; credits: number; desc: string };
type Row = {
  batchId: string;
  label: string;
  sku: string;
  quantity: number;
  count: number;
  issuedAt: string;
  expiresAt: string;
  used: number;
  remaining: number;
  revoked: number;
  issuedBy: string;
  note?: string;
};
type Totals = {
  batches: number;
  issued: number;
  used: number;
  active: number;
  expired: number;
  revoked: number;
  creditsGranted: number;
  unlocksGranted: number;
  expiringSoon: number;
};

const inputClass =
  'w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10';

/**
 * 운영 콘솔 — 교환권 발급·폐기·대사.
 *  · 발급 직후 원문 코드는 이 화면에서 한 번만 보인다. 새로고침하면 다시 볼 수 없다(해시만 저장).
 *  · 코드 원문은 서버 응답 외 어디에도 남기지 않는다 — 복사·전달 책임은 운영자에게 있다.
 */
export function AdminRedeemPanel({ rows, totals, catalog }: { rows: Row[]; totals: Totals; catalog: CatalogItem[] }) {
  const router = useRouter();
  const [sku, setSku] = useState(catalog[0]?.sku ?? 'pack-unlock-single');
  const [count, setCount] = useState(1);
  const [label, setLabel] = useState('단건 완성권 교환권');
  const [validDays, setValidDays] = useState(365);
  const [note, setNote] = useState('');
  const [issueToEmail, setIssueToEmail] = useState('');
  const [issued, setIssued] = useState<{ batchId: string; codes: string[]; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function issue() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    setIssued(null);
    try {
      const res = await fetch('/api/admin/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'issue',
          sku,
          count: Number(count),
          quantity: 1,
          label,
          validDays: Number(validDays),
          ...(note.trim() ? { note: note.trim() } : {}),
          ...(issueToEmail.trim() ? { issueToEmail: issueToEmail.trim() } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '발급하지 못했어요.');
      setIssued({ batchId: json.batch.id, codes: json.codes, label: json.batch.label });
      setMessage({ tone: 'good', text: `${json.codes.length}개를 발급했어요. 코드는 지금 한 번만 보여요 — 복사해 두세요.` });
      router.refresh();
    } catch (e) {
      setMessage({ tone: 'bad', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function revoke(batchId: string) {
    if (revoking) return;
    setRevoking(batchId);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke', batchId, reason: '운영자 폐기' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '폐기하지 못했어요.');
      setMessage({ tone: 'good', text: `남은 코드 ${json.revoked}개를 폐기했어요.` });
      router.refresh();
    } catch (e) {
      setMessage({ tone: 'bad', text: (e as Error).message });
    } finally {
      setRevoking(null);
    }
  }

  async function copyAll() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.codes.map((code) => code.match(/.{1,4}/g)?.join('-') ?? code).join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage({ tone: 'bad', text: '클립보드에 복사하지 못했어요. 코드를 직접 선택해 복사해 주세요.' });
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-black">교환권 발급 · 대사</p>
        <span className="chip !bg-cream">PG 없이 지급</span>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-sub">
        사업자·카드사 심사 없이 코드로 상품을 인도합니다. 발급 즉시 지급 가능하며, 코드 원문은 발급 응답에서만 보입니다(저장은 해시만).
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="발급" value={totals.issued} />
        <Metric label="사용" value={totals.used} />
        <Metric label="사용 가능" value={totals.active} />
        <Metric label="지급 크레딧" value={totals.creditsGranted} />
        <Metric label="잠금 해제" value={totals.unlocksGranted} />
        <Metric label="폐기" value={totals.revoked} />
        <Metric label="만료" value={totals.expired} />
        <Metric label="30일 내 만료" value={totals.expiringSoon} />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <label className="text-[11px] font-black text-sub">
          상품
          <select className={`${inputClass} mt-1`} value={sku} onChange={(e) => setSku(e.target.value)}>
            {catalog.map((item) => (
              <option key={item.sku} value={item.sku}>
                {item.title} (정가 {item.price.toLocaleString('ko-KR')}원)
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] font-black text-sub">
          표시 이름
          <input className={`${inputClass} mt-1`} value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} />
        </label>
        <label className="text-[11px] font-black text-sub">
          발급 개수 (1~200)
          <input
            className={`${inputClass} mt-1`}
            type="number"
            min={1}
            max={200}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </label>
        <label className="text-[11px] font-black text-sub">
          유효기간 (일)
          <input
            className={`${inputClass} mt-1`}
            type="number"
            min={1}
            max={1095}
            value={validDays}
            onChange={(e) => setValidDays(Number(e.target.value))}
          />
        </label>
        <label className="text-[11px] font-black text-sub">
          귀속 계정 이메일 (선택)
          <input
            className={`${inputClass} mt-1`}
            value={issueToEmail}
            onChange={(e) => setIssueToEmail(e.target.value)}
            placeholder="비우면 누구나 사용 가능"
            autoComplete="off"
          />
        </label>
        <label className="text-[11px] font-black text-sub">
          메모 (선택)
          <input
            className={`${inputClass} mt-1`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="입금자명·주문번호 등"
            maxLength={200}
          />
        </label>
      </div>

      <button type="button" className="btn-primary mt-3 w-full !py-3 text-xs" onClick={() => void issue()} disabled={busy}>
        {busy ? '발급 중…' : `${count}개 발급`}
      </button>

      {message ? (
        <p
          role={message.tone === 'bad' ? 'alert' : 'status'}
          className={`mt-3 rounded-xl border-2 p-3 text-[11px] font-bold ${
            message.tone === 'good' ? 'border-mint/40 bg-mint/10 text-ink' : 'border-coral/50 bg-coral/10 text-coralink'
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {issued ? (
        <div className="mt-3 rounded-xl border-2 border-ink/15 bg-cream p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-black text-ink">{issued.label} · 원문 코드</p>
            <button type="button" className="btn-ghost !px-3 !py-1 text-[10px]" onClick={() => void copyAll()}>
              {copied ? '복사됨' : '전체 복사'}
            </button>
          </div>
          <ul className="mt-2 space-y-1">
            {issued.codes.map((code) => (
              <li key={code} className="select-all break-all rounded-lg bg-white px-2 py-1 font-mono text-[11px] tracking-wider text-ink">
                {code.match(/.{1,4}/g)?.join('-') ?? code}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] leading-relaxed text-coralink">
            이 목록은 새로고침하면 사라집니다. 지금 복사해 구입자에게 전달하세요. (원문 복구·재확인 불가 — 필요하면 재발급 후 기존 묶음 폐기)
          </p>
        </div>
      ) : null}

      <div className="mt-4 border-t border-line pt-3">
        <p className="text-xs font-black">발급 묶음</p>
        {rows.length === 0 ? (
          <p className="mt-2 text-[11px] text-sub">아직 발급한 교환권이 없습니다.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {rows.map((row) => (
              <li key={row.batchId} className="rounded-xl border border-line bg-white p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-black">{row.label}</p>
                    <p className="text-[10px] text-sub">
                      {row.sku} · {row.count}개 · 사용 {row.used} / 남음 {row.remaining}
                      {row.revoked ? ` · 폐기 ${row.revoked}` : ''}
                    </p>
                    <p className="text-[10px] text-sub">
                      {new Date(row.issuedAt).toLocaleDateString('ko-KR')} 발급 · {new Date(row.expiresAt).toLocaleDateString('ko-KR')} 만료
                      {row.note ? ` · ${row.note}` : ''}
                    </p>
                  </div>
                  {row.remaining > 0 ? (
                    <button
                      type="button"
                      className="btn-ghost shrink-0 !px-2.5 !py-1 text-[10px]"
                      onClick={() => void revoke(row.batchId)}
                      disabled={revoking !== null}
                    >
                      {revoking === row.batchId ? '폐기 중…' : '남은 코드 폐기'}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-sub">
        대사: 사용된 코드는 <code className="font-mono">provider=redeem</code> 주문과 크레딧 원장에 남습니다. 현금·계좌 입금 확인은 별도로 기록하고, 발급일·입금일·지급 수량을 대조하세요. 교환권은 PG 승인 기록이 없으므로 &lsquo;무료 지급 부채&rsquo;로 관리합니다.
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-white px-2.5 py-2">
      <p className="text-[9px] font-black uppercase tracking-wider text-sub/80">{label}</p>
      <p className="text-lg font-black leading-tight">{value}</p>
    </div>
  );
}
