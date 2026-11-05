'use client';

import { useState } from 'react';
import { localizedPath, tr, type Locale } from '@/lib/i18n/locale';

export function LogoutButton({ locale = 'ko' }: { locale?: Locale }) {
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) throw new Error('logout failed');
      window.location.assign(localizedPath(locale, '/'));
    } catch {
      setError(true);
      setBusy(false);
    }
  }
  return (
    <span className="flex shrink-0 flex-col items-end whitespace-nowrap">
      <button onClick={logout} disabled={busy} className="whitespace-nowrap text-xs font-bold text-sub underline">{tr(locale, '로그아웃', 'Sign out')}</button>
      {error && <span role="alert" className="text-xs text-coralink">{tr(locale, '실패. 다시 시도해 주세요.', 'Could not sign out. Try again.')}</span>}
    </span>
  );
}
