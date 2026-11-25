'use client';

import { useEffect, useMemo, useState } from 'react';
import { kstDayDiff } from '@/lib/season';

// ─────────────────────────────────────────────────────────────
// 시즌 오픈 카운트다운 — 서버가 준 시각을 기준으로 1초마다 다시 센다.
//  · 첫 렌더는 서버 값 그대로(nowIso) → hydration 불일치 없음.
//  · 형식: D-16 · 09:12:44  (오늘이면 D-DAY, 시계만)
// ─────────────────────────────────────────────────────────────

const pad2 = (n: number) => String(n).padStart(2, '0');

export function SeasonCountdownClock({
  targetIso,
  nowIso,
  size = 'md',
  doneLabel = 'D-DAY',
}: {
  targetIso: string;
  nowIso: string;
  size?: 'sm' | 'md' | 'lg';
  doneLabel?: string;
}) {
  const targetMs = useMemo(() => {
    const parsed = Date.parse(targetIso);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [targetIso]);
  const startMs = useMemo(() => {
    const parsed = Date.parse(nowIso);
    return Number.isFinite(parsed) ? parsed : Date.now();
  }, [nowIso]);
  const [nowMs, setNowMs] = useState(startMs);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const total = Math.max(0, targetMs - nowMs);
  // D-day 는 '남은 밀리초'가 아니라 KST 달력 날짜 차이로 센다 (홈·허브와 같은 숫자).
  const days = Math.max(0, kstDayDiff(nowMs, targetMs));
  const clock = `${pad2(Math.floor((total % 86_400_000) / 3_600_000))}:${pad2(Math.floor((total % 3_600_000) / 60_000))}:${pad2(Math.floor((total % 60_000) / 1000))}`;
  const dayText = days > 0 ? `D-${days}` : doneLabel;
  const dayClass =
    size === 'lg'
      ? 'text-[34px] sm:text-[42px]'
      : size === 'sm'
        ? 'text-[16px]'
        : 'text-[24px]';
  const clockClass = size === 'lg' ? 'text-[16px]' : size === 'sm' ? 'text-[10.5px]' : 'text-[12px]';

  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className={`font-extrabold leading-none tracking-[-0.03em] tabular-nums ${dayClass}`}>{dayText}</span>
      {days > 0 || total > 0 ? (
        <span className={`font-bold tabular-nums text-sub ${clockClass}`}>{clock}</span>
      ) : null}
    </span>
  );
}
