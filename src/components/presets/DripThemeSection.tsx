'use client';

// ─────────────────────────────────────────────────────────────
// 드립·밈 추천 대사 7테마 66컷 (공개 /presets · /en/presets)
//  · 문구는 src/data/drip-themes.ts — 대사 팩(/quotes)과 같은 원본을 쓴다.
//  · 테마 카드를 펴면 그 테마의 대사가 전부 보이고, 감정(표정) 배지도 함께 보인다.
//  · "대사로 바로 만들기"는 대사 스튜디오에서 그 테마를 골라 연 채로 이동하고,
//    "사진으로 24컷"은 표현 형태(drip) 팩 만들기로 이동한다.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { DRIP_LINES, DRIP_PACK_ID, DRIP_THEMES, type DripTheme } from '@/data/drip-themes';
import { EMOTIONS } from '@/lib/art/sticker';
import { localizedPath, tr, type Locale } from '@/lib/i18n/locale';

const PREVIEW_LINES = 4;

export function DripThemeSection({ locale }: { locale: Locale }) {
  const t = (ko: string, en: string) => tr(locale, ko, en);
  const lp = (href: string) => localizedPath(locale, href);
  const [openId, setOpenId] = useState<string | null>(null);

  const quoteHref = (theme: DripTheme) => lp(`/quotes?pack=${DRIP_PACK_ID}&theme=${theme.id}`);

  return (
    <section aria-labelledby="drip-themes" className="mt-8 rounded-2xl border-2 border-primary/30 bg-primary/[0.03] p-3 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="eyebrow text-primary-dark">DRIP &amp; MEME · {DRIP_THEMES.length} THEMES · {DRIP_LINES.length} CUTS</p>
          <h2 id="drip-themes" className="mt-1 text-lg font-black break-keep sm:text-xl">
            {t(`킹받는 반전·드립 7테마 ${DRIP_LINES.length}컷`, `Deadpan drip: 7 themes, ${DRIP_LINES.length} lines`)}
          </h2>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-sub">
            {t(
              '스크린샷으로만 돌던 반전 인사·넵티콘·단톡방 티키타카·부산 사투리·능청 주접·축하 센스 대사를 한자리에 모았어요. 테마를 펴서 문구를 고르고, 그대로 이모티콘으로 만들면 됩니다.',
              'Every deadpan line we keep screenshotting — twist greetings, soulless yes, group-chat banter, Busan quips, flirty cheese and family cheers — in one place. Open a theme and turn any line into a sticker.',
            )}
          </p>
        </div>
        <Link href={lp(`/quotes?pack=${DRIP_PACK_ID}`)} className="btn-primary w-full shrink-0 !px-4 !py-2 text-xs sm:w-auto">
          {t('대사 스튜디오에서 66컷 보기 →', 'See all 66 in the quote studio →')}
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {DRIP_THEMES.map((theme) => {
          const open = openId === theme.id;
          const lines = open ? theme.lines : theme.lines.slice(0, PREVIEW_LINES);
          const detailId = `drip-theme-${theme.id}`;
          return (
            <article key={theme.id} className={clsx('flex h-full flex-col rounded-2xl border-2 bg-paper p-4 shadow-card transition', open ? 'border-primary' : 'border-line')}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-black break-keep">
                  <span aria-hidden="true">{theme.emoji}</span> {locale === 'en' ? theme.titleEn : theme.title}
                </h3>
                <span className="chip shrink-0 !bg-cream !px-2 !py-0.5 !text-[10px]">{theme.lines.length}{t('컷', ' cuts')}</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-sub">{locale === 'en' ? theme.taglineEn : theme.tagline}</p>

              <ul id={detailId} className="mt-3 space-y-1.5">
                {lines.map((item) => (
                  <li key={item.id} className="flex items-start gap-1.5 text-[12px] leading-snug text-ink/85">
                    <span aria-hidden="true" className="shrink-0 text-[11px]">{EMOTIONS[item.emotion]?.emoji}</span>
                    <span className="min-w-0">
                      {locale === 'en' ? item.lineEn : item.line}
                      <span className="ml-1 text-[10px] text-sub">[{EMOTIONS[item.emotion]?.label ?? item.emotion}]</span>
                    </span>
                  </li>
                ))}
              </ul>

              {theme.lines.length > PREVIEW_LINES ? (
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={detailId}
                  onClick={() => setOpenId(open ? null : theme.id)}
                  className="mt-2 self-start rounded-full border border-line bg-cream px-3 py-1 text-[10px] font-black text-sub transition hover:text-ink"
                >
                  {open
                    ? t('접기', 'Show less')
                    : t(`${theme.lines.length - PREVIEW_LINES}개 더 보기`, `Show ${theme.lines.length - PREVIEW_LINES} more`)}
                </button>
              ) : null}

              <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                <Link href={quoteHref(theme)} className="btn-primary !px-3 !py-1.5 text-[11px]">
                  {t('대사로 바로 만들기 →', 'Make it from a line →')}
                </Link>
                <Link href={lp('/studio/upload?format=drip')} className="btn-ghost !px-3 !py-1.5 text-[11px]">
                  {t('내 사진으로 24컷', '24 cuts with my photo')}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
