'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdminLogin({
  disabled = false,
  pinPad = false,
  onSuccess,
}: {
  /** 운영자 코드(ADMIN_PASSCODE) 미설정 상태 */
  disabled?: boolean;
  /** 설정의 숨은 진입에서는 4자리 숫자 패드를 제공한다. 코드 자체는 서버에서만 검증한다. */
  pinPad?: boolean;
  onSuccess?: () => void;
} = {}) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(value = code) {
    if (busy || !value || disabled) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: value }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '실패');
      onSuccess?.();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      if (pinPad) setCode('');
      setBusy(false);
    }
  }

  function updateCode(value: string) {
    if (busy) return;
    const next = pinPad ? value.replace(/\D/g, '').slice(0, 4) : value;
    setCode(next);
    setError(null);
    if (pinPad && next.length === 4) void submit(next);
  }

  return (
    <div className="card mx-auto w-full max-w-sm p-6">
      <p className="pr-12 text-sm font-bold">운영자 로그인</p>
      {disabled ? (
        <p className="mt-1 rounded-lg border border-coral/40 bg-coral/10 px-2 py-1.5 text-[11px] font-bold text-coralink">
          운영자 코드(ADMIN_PASSCODE)가 설정되지 않아 로그인이 차단되었습니다.
        </p>
      ) : null}
      <input
        type="password"
        value={code}
        onChange={(e) => updateCode(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
        className="mt-3 min-h-12 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-center text-lg tracking-[0.35em] outline-none focus:border-primary"
        placeholder={pinPad ? '••••' : '운영자 코드'}
        aria-label={pinPad ? '4자리 운영자 PIN' : '운영자 코드'}
        inputMode={pinPad ? 'numeric' : undefined}
        pattern={pinPad ? '[0-9]*' : undefined}
        maxLength={pinPad ? 4 : 128}
        autoComplete="off"
        autoFocus
      />
      <p className="mt-2 text-[11px] leading-relaxed text-sub">
        닉네임 <strong className="text-ink">풍고</strong> + 운영자 코드로 로그인하면 크레딧·플랜 제한 없이 모든 기능을 사용합니다.
      </p>
      {pinPad ? (
        <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="숫자 PIN 패드">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => <button key={digit} type="button" disabled={busy || disabled} onClick={() => updateCode(`${code}${digit}`)} className="min-h-12 rounded-xl border border-line bg-cream text-lg font-bold hover:border-primary disabled:opacity-40">{digit}</button>)}
          <button type="button" disabled={busy || disabled || !code} onClick={() => updateCode('')} className="min-h-12 rounded-xl border border-line bg-paper text-xs font-bold text-sub hover:border-primary disabled:opacity-40">지우기</button>
          <button type="button" disabled={busy || disabled} onClick={() => updateCode(`${code}0`)} className="min-h-12 rounded-xl border border-line bg-cream text-lg font-bold hover:border-primary disabled:opacity-40">0</button>
          <button type="button" aria-label="한 자리 삭제" disabled={busy || disabled || !code} onClick={() => updateCode(code.slice(0, -1))} className="min-h-12 rounded-xl border border-line bg-paper text-lg font-bold text-sub hover:border-primary disabled:opacity-40">⌫</button>
        </div>
      ) : null}
      {error ? <p role="alert" className="mt-2 text-[11px] font-bold text-coralink">{error}</p> : null}
      <button className="btn-primary mt-3 min-h-12 w-full !py-3" onClick={() => void submit()} disabled={busy || !code || disabled}>
        {busy ? '확인 중…' : '들어가기'}
      </button>
    </div>
  );
}
