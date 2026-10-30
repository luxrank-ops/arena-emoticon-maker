'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CheckoutButton({
  sku,
  label,
  className = 'btn-primary w-full',
  disabled,
}: {
  sku: string;
  label: string;
  className?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '주문을 만들 수 없습니다');
      router.push(`/checkout/${json.order.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      <button className={className} onClick={go} disabled={busy || disabled}>
        {busy ? '이동 중…' : label}
      </button>
      {error ? <p className="mt-2 text-center text-[11px] font-bold text-coralink">{error}</p> : null}
    </div>
  );
}
