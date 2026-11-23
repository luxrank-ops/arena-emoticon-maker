'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { localizedPath, tr, type Locale } from '@/lib/i18n/locale';

/**
 * 로그아웃 — 헤더 계정 칩 안의 아이콘 버튼.
 *  · 예전의 밑줄 텍스트 대신 24px 아이콘으로 줄이고, 실패하면 칩 아래에 짧게 알린다.
 */
export function LogoutButton({ locale = 'ko' }: { locale?: Locale }) {
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    setError(false);
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
    <span className="relative flex shrink-0 items-center">
      <button
        onClick={logout}
        disabled={busy}
        aria-label={tr(locale, '로그아웃', 'Sign out')}
        title={tr(locale, '로그아웃', 'Sign out')}
        className="grid h-6 w-6 place-items-center rounded-full text-sub/70 transition hover:bg-primary/[0.08] hover:text-primary-dark disabled:opacity-40"
      >
        <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {error ? (
        <span
          role="alert"
          className="absolute right-0 top-full z-50 mt-2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[10px] font-bold text-white shadow-pop"
        >
          {tr(locale, '로그아웃 실패 · 다시 시도', 'Sign-out failed · try again')}
        </span>
      ) : null}
    </span>
  );
}
