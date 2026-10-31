'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Stats {
  stored: number;
  due: number;
  purgedEvents: number;
}

/** 운영 콘솔 — 얼굴 파기 현황 + 수동 실행 (정책: 24h 이내 파기) */
export function PurgePanel({ stats }: { stats: Stats }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'dry' | 'run' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(mode: 'dry' | 'run') {
    setBusy(mode);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'dry' ? { dryRun: true } : {}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '실행에 실패했습니다');
      const r = json.result as { purged: number; faceIds: string[]; remaining: number };
      setMessage(
        mode === 'dry'
          ? `파기 예정 ${r.faceIds.length}건 · 보관 중 ${r.remaining}건`
          : `${r.purged}건 파기 완료 · 남은 보관 ${r.remaining}건`,
      );
      if (mode === 'run') router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black">얼굴 정보 파기</p>
        <span className="chip !bg-cream">24h 정책</span>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-sub">
        보관 중 <strong className="text-ink">{stats.stored}건</strong> · 파기 대기{' '}
        <strong className="text-ink">{stats.due}건</strong> · 누적 파기 로그 {stats.purgedEvents}건
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-ghost !py-1.5 text-[11px]" disabled={!!busy} onClick={() => run('dry')}>
          {busy === 'dry' ? '확인 중…' : '파기 예정 확인'}
        </button>
        <button className="btn-dark !py-1.5 text-[11px]" disabled={!!busy} onClick={() => run('run')}>
          {busy === 'run' ? '실행 중…' : '지금 파기 실행'}
        </button>
      </div>
      {message ? <p className="mt-2 text-[11px] font-bold text-mint">{message}</p> : null}
      {error ? <p className="mt-2 text-[11px] font-bold text-coralink">{error}</p> : null}
      <p className="mt-2 text-[10px] leading-relaxed text-sub">
        파기해도 이미 만든 팩은 계속 렌더됩니다(팩에 비식별 스냅샷 고정). 크론: 매시 정각 `/api/cron/purge`.
      </p>
    </div>
  );
}
