'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Lock } from 'lucide-react';
import { SeasonPropArt } from '@/components/season/SeasonPropArt';
import { track } from '@/lib/analytics';
import type { SeasonPackView } from '@/lib/season';
import { seasonPropById } from '@/lib/studio/season-props';
import { tr, type Locale } from '@/lib/i18n/locale';

// ─────────────────────────────────────────────────────────────
// 시즌팩 커밍순 티저 (홈 · 만들기 허브)
//  · 서버가 계산한 상태(stage·D-day·오픈일)를 그대로 받아 그리고,
//    초 단위 카운트다운만 브라우저에서 다시 센다(첫 렌더는 서버 값과 같아 hydration 이 어긋나지 않는다).
//  · 카드를 누르면 GA4 `season_teaser_click` 이 남는다 — 어느 시즌이 클릭을 끄는지 본다.
// ─────────────────────────────────────────────────────────────

const pad2 = (n: number) => String(n).padStart(2, '0');

function countdownText(targetMs: number, nowMs: number) {
  const total = Math.max(0, targetMs - nowMs);
  return {
    days: Math.floor(total / 86_400_000),
    clock: `${pad2(Math.floor((total % 86_400_000) / 3_600_000))}:${pad2(Math.floor((total % 3_600_000) / 60_000))}:${pad2(Math.floor((total % 60_000) / 1000))}`,
  };
}

export function SeasonTeaser({
  views,
  nowIso,
  locale,
  query = '',
  variant = 'home',
}: {
  views: SeasonPackView[];
  /** 서버가 판정에 쓴 시각 — 첫 렌더의 기준값 */
  nowIso: string;
  locale: Locale;
  /** 검수 모드 파라미터(?preview=season&at=) — 링크에 이어 붙여 모드를 유지한다 */
  query?: string;
  variant?: 'home' | 'hub';
}) {
  const t = (ko: string, en: string) => tr(locale, ko, en);
  const startMs = useMemo(() => {
    const parsed = Date.parse(nowIso);
    return Number.isFinite(parsed) ? parsed : Date.now();
  }, [nowIso]);
  const [nowMs, setNowMs] = useState(startMs);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!views.length) return;
    track('season_teaser_view', {
      count: views.length,
      stages: views.map((view) => view.stage).join(','),
      surface: variant,
    });
  }, [views, variant]);

  if (!views.length) return null;

  // 시계는 '가장 가까운 한 팩'에만 흡린다 — 세 카드가 같은 시각을 반복하면 오류처럼 보인다.
  const nextTargetMs = views.filter((view) => view.stage !== 'open').reduce<number | null>(
    (min, view) => (min === null || view.targetMs < min ? view.targetMs : min),
    null,
  );

  return (
    <section
      aria-labelledby={`season-teaser-title-${variant}`}
      className={variant === 'home' ? 'wrap py-8 sm:py-10' : 'mt-9'}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="eyebrow">SEASON PACKS</p>
          <h2
            id={`season-teaser-title-${variant}`}
            className={variant === 'home' ? 'mt-2 text-lg font-extrabold tracking-[-0.025em] sm:text-xl' : 'mt-2 text-base font-extrabold tracking-[-0.02em]'}
          >
            {t('다음 시즌, 미리 예약해 두세요', 'Next season, pre-booked')}
          </h2>
          <p className="mt-1 break-keep text-xs leading-relaxed text-sub sm:text-sm">
            {t(
              '크리스마스·새해·설날 팩은 오픈일에 자동으로 열려요. 열리면 여기서 바로 만들 수 있어요.',
              'Christmas, New Year and Lunar New Year packs open automatically on their day.',
            )}
          </p>
        </div>
        <Link
          href={`/season${query}`}
          onClick={() => track('season_teaser_click', { pack: 'all', stage: 'list', surface: variant })}
          className="group inline-flex items-center gap-1 text-xs font-black text-primary-dark"
        >
          {t('시즌팩 전체 보기', 'All season packs')}
          <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>

      <ul className="mt-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:pb-0">
        {views.map((view) => {
          const { pack, stage } = view;
          const { clock } = countdownText(view.targetMs, nowMs);          const open = stage === 'open';
          const propId = pack.propIds[0] ?? '';
          const prop = seasonPropById(propId);
          const headline =
            open
              ? t('지금 오픈', 'Open now')
              : stage === 'teasing'
                ? t(`${view.openLabel} 오픈`, `Opens ${view.openLabelEn}`)
                : t(`${view.teaseLabel} 티저 공개`, `Teaser ${view.teaseLabelEn}`);
          return (
            <li key={pack.id} className="min-w-[76%] snap-start sm:min-w-0">
              <Link
                href={`/season${query}#${pack.id}`}
                onClick={() =>
                  track('season_teaser_click', {
                    pack: pack.id,
                    stage,
                    dday: view.dday,
                    surface: variant,
                  })
                }
                className="group relative flex h-full flex-col overflow-hidden rounded-[1.4rem] border border-line/80 bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-pop"
              >
                <div className={`relative h-[96px] overflow-hidden bg-gradient-to-br ${pack.accent.from} ${pack.accent.to}`}>
                  <span aria-hidden="true" className="absolute -left-5 -top-8 h-24 w-24 rounded-full bg-white/20 blur-md" />
                  <span aria-hidden="true" className="absolute bottom-[-26px] right-8 h-16 w-16 rounded-full bg-white/15" />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/85 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-[0.08em] text-ink shadow-sm backdrop-blur">
                    {open ? <span aria-hidden="true">✨</span> : <Lock className="h-2.5 w-2.5" aria-hidden="true" />}
                    {open ? t('오픈', 'OPEN') : t('커밍순', 'COMING SOON')}
                  </span>
                  <span className="absolute bottom-1 right-2 block h-[74px] w-[74px] rounded-full border border-white/70 bg-white/85 p-2 shadow-[0_8px_18px_-10px_rgba(23,16,43,0.55)] backdrop-blur">
                    <SeasonPropArt id={propId} title={prop?.label} />
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-3.5">
                  <span className="text-[9.5px] font-black uppercase tracking-[0.16em] text-sub/80">
                    {t(`시즌팩 ${pack.order}`, `Season ${pack.order}`)}
                  </span>
                  <span className="mt-0.5 break-keep text-[14.5px] font-extrabold leading-tight tracking-[-0.02em]">
                    <span aria-hidden="true" className="mr-1">{pack.emoji}</span>
                    {locale === 'en' ? pack.titleEn : pack.title}
                  </span>
                  <span className="mt-1.5 flex items-baseline gap-1.5">
                    <span className={`text-[21px] font-extrabold leading-none tracking-[-0.03em] ${pack.accent.ink}`}>
                      {open ? t('D-DAY', 'LIVE') : `D-${view.dday}`}
                    </span>
                    {open || view.targetMs !== nextTargetMs ? null : (
                      <span className="text-[11px] font-bold tabular-nums text-sub">{clock}</span>
                    )}
                  </span>
                  <span className="mt-1 text-[10.5px] font-bold leading-relaxed text-sub/90">{headline}</span>
                  <span className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-black text-primary-dark">
                    {open ? t('바로 만들기', 'Make now') : t('미리 보기', 'Preview')}
                    <ChevronRight className="h-3 w-3 transition group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
