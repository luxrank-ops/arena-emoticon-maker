'use client';

import { useEffect, useState } from 'react';
import { tr, type Locale } from '@/lib/i18n/locale';

export function GenerationProgress({
  label,
  progress,
  tip,
  locale = 'ko',
}: {
  label: string;
  /** 완료한 실제 작업 단계 기준 값. 생략하면 길이를 알 수 없는 분석으로 표시한다. */
  progress?: number;
  tip: string;
  locale?: Locale;
}) {
  const t = (ko: string, en: string) => tr(locale, ko, en);
  const determinate = typeof progress === 'number';
  const value = determinate ? Math.max(0, Math.min(100, Math.round(progress))) : null;
  const [tipIndex, setTipIndex] = useState(0);
  const [tipVisible, setTipVisible] = useState(true);
  const tips = [
    tip,
    t('밝고 선명한 정면 사진일수록 표정과 얼굴형을 더 안정적으로 확인할 수 있어요.', 'A bright, sharp, front-facing photo helps preserve facial features and expressions.'),
    t('완성된 뒤에는 각 컷의 대사와 표정을 개별적으로 수정할 수 있어요.', 'After generation, you can edit every sticker’s caption and expression individually.'),
  ];

  useEffect(() => {
    setTipIndex(0);
    setTipVisible(true);
    let swapTimer: ReturnType<typeof setTimeout> | null = null;
    const interval = setInterval(() => {
      setTipVisible(false);
      swapTimer = setTimeout(() => {
        setTipIndex((current) => (current + 1) % 3);
        setTipVisible(true);
      }, 250);
    }, 3000);
    return () => {
      clearInterval(interval);
      if (swapTimer) clearTimeout(swapTimer);
    };
  }, [tip, locale]);

  return (
    <div className="card border-primary/15 bg-paper p-5 shadow-pop motion-safe:animate-fade-scale" role="status" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-4">
        <div className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/5 to-cyber/5">
          <svg viewBox="0 0 88 88" className="h-20 w-20 motion-safe:animate-pulse" aria-hidden="true">
            <circle cx="44" cy="27" r="17" fill="#FFFFFF" stroke="#1A237E" strokeWidth="2.5" strokeDasharray="5 4" />
            <path d="M18 79c1-23 12-33 26-33s25 10 26 33" fill="#FFFFFF" stroke="#1A237E" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 4" />
            <path d="M44 47v26M30 57l14 7 14-7M35 79l9-15 9 15" fill="none" stroke="#7C4DFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".7" />
            <path d="M36 27h1m14 0h1M39 35c3 2 7 2 10 0" fill="none" stroke="#7C4DFF" strokeWidth="2.5" strokeLinecap="round" />
            <g className="motion-safe:animate-scan-y">
              <path d="M12 42h64" stroke="#7C4DFF" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="12" cy="42" r="2.5" fill="#7C4DFF" />
              <circle cx="76" cy="42" r="2.5" fill="#7C4DFF" />
            </g>
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-bold leading-snug text-cyber">{label}</p>
            {value !== null ? <span className="shrink-0 text-lg font-bold text-primary-dark">{value}%</span> : null}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-sub">{t('얼굴 윤곽과 캐릭터 일관성을 순서대로 확인하고 있어요.', 'We are checking facial structure and character consistency step by step.')}</p>
        </div>
      </div>
      <div
        className="mt-4 h-2.5 overflow-hidden rounded-full bg-line/70"
        role="progressbar"
        aria-label={t('캐릭터 일관성 확인 진행률', 'Character consistency progress')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value ?? undefined}
        aria-valuetext={value === null ? t('분석 중', 'Analyzing') : `${value}%`}
      >
        <div
          className={determinate ? 'h-full rounded-full bg-primary transition-[width] duration-500 ease-out' : 'h-full w-full animate-shimmer bg-[length:200%_100%] bg-gradient-to-r from-primary/10 via-primary to-primary/10'}
          style={determinate ? { width: `${value}%` } : undefined}
        />
      </div>
      <p aria-live="off" className={`mt-3 min-h-8 text-center text-[11px] leading-relaxed text-sub transition-opacity duration-300 ${tipVisible ? 'opacity-100' : 'opacity-0'}`}>{tips[tipIndex]}</p>
    </div>
  );
}
