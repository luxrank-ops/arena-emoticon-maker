'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) throw new Error('logout failed');
      window.location.assign('/');
    } catch { setError(true); setBusy(false); }
  }
  return <span className="flex flex-col items-end"><button onClick={logout} disabled={busy} className="text-xs font-bold text-sub underline">로그아웃</button>{error && <span role="alert" className="text-xs text-coralink">실패. 다시 시도해 주세요.</span>}</span>;
}
