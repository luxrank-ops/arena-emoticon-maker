'use client';

import { useEffect, useRef, useState } from 'react';
import { AdminLogin } from '@/app/admin/AdminLogin';

export function AdminAccess({ version, disabled }: { version: string; disabled: boolean }) {
  const [taps, setTaps] = useState(0);
  const [open, setOpen] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function reveal() {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    const next = taps + 1;
    if (next >= 5) {
      setTaps(0);
      setOpen(true);
      return;
    }
    setTaps(next);
    resetTimer.current = setTimeout(() => setTaps(0), 2500);
  }

  return (
    <>
      <button type="button" onClick={reveal} className="min-h-12 w-full rounded-xl px-3 text-left text-xs font-bold text-sub hover:bg-cream">
        앱 버전 정보 <span className="float-right font-normal">v{version}</span>
      </button>
      {open ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/55 p-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-label="운영자 인증" className="relative max-h-[92dvh] w-full max-w-sm overflow-y-auto rounded-3xl border-2 border-ink bg-paper p-3 shadow-pop">
            <button type="button" aria-label="운영자 인증 닫기" onClick={() => setOpen(false)} className="absolute right-5 top-5 z-10 grid h-12 w-12 place-items-center rounded-full border-2 border-line bg-cream text-xl font-black hover:border-ink">×</button>
            <AdminLogin pinPad disabled={disabled} onSuccess={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
