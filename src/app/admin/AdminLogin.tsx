'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdminLogin({
  demoHint = true,
  disabled = false,
}: {
  /** 데모 코드 안내 노출 여부 */
  demoHint?: boolean;
  /** 운영자 코드(ADMIN_PASSCODE) 미설정 상태 */
  disabled?: boolean;
} = {}) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: code }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '실패');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="card mx-auto max-w-sm p-6">
      <p className="text-sm font-black">운영자 로그인</p>
      {disabled ? (
        <p className="mt-1 rounded-lg border border-coral/40 bg-coral/10 px-2 py-1.5 text-[11px] font-bold text-coralink">
          운영자 코드(ADMIN_PASSCODE)가 설정되지 않아 로그인이 차단되었습니다.
        </p>
      ) : demoHint ? (
        <p className="mt-1 text-xs text-sub">데모 코드: emotime-demo</p>
      ) : null}
      <input
        type="password"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="mt-3 w-full rounded-xl border-2 border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-ink"
        placeholder="운영자 코드"
      />
      {error ? <p className="mt-2 text-[11px] font-bold text-coralink">{error}</p> : null}
      <button className="btn-primary mt-3 w-full !py-3" onClick={submit} disabled={busy || !code || disabled}>
        {busy ? '확인 중…' : '들어가기'}
      </button>
    </div>
  );
}
