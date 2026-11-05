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
  return (
    <div className="card border-ink bg-paper p-5" role="status" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-4">
        <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-line bg-cream">
          <svg viewBox="0 0 88 88" className="h-16 w-16 motion-safe:animate-pulse" aria-hidden="true">
            <circle cx="44" cy="29" r="17" fill="#FFFDFA" stroke="#191512" strokeWidth="3" strokeDasharray="5 4" />
            <path d="M18 78c1-22 12-32 26-32s25 10 26 32" fill="#FFFDFA" stroke="#191512" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 4" />
            <path d="M36 29h1m14 0h1M39 37c3 2 7 2 10 0" fill="none" stroke="#FF6B5B" strokeWidth="3" strokeLinecap="round" />
            <path d="M12 44h64" stroke="#FFCF4D" strokeWidth="3" strokeLinecap="round" opacity=".8" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-black leading-snug">{label}</p>
            {value !== null ? <span className="shrink-0 text-lg font-black text-coralink">{value}%</span> : null}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-sub">{t('얼굴 윤곽과 캐릭터 일관성을 순서대로 확인하고 있어요.', 'We are checking facial structure and character consistency step by step.')}</p>
        </div>
      </div>
      <div
        className="mt-4 h-3 overflow-hidden rounded-full border-2 border-ink bg-cream"
        role="progressbar"
        aria-label={t('캐릭터 일관성 확인 진행률', 'Character consistency progress')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value ?? undefined}
        aria-valuetext={value === null ? t('분석 중', 'Analyzing') : `${value}%`}
      >
        <div
          className={determinate ? 'h-full rounded-full bg-coral transition-[width] duration-500' : 'h-full w-full animate-shimmer bg-[length:200%_100%] bg-gradient-to-r from-coral/15 via-coral to-coral/15'}
          style={determinate ? { width: `${value}%` } : undefined}
        />
      </div>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-sub">{tip}</p>
    </div>
  );
}
