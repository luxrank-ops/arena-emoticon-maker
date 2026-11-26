import Link from 'next/link';
import { ArrowRight, CalendarClock, Lock, Sparkles, Tag } from 'lucide-react';
import { SeasonPropArt } from '@/components/season/SeasonPropArt';
import { SeasonCountdownClock } from '@/components/season/SeasonCountdownClock';
import { getLocale } from '@/lib/i18n/server';
import { localizedPath, tr } from '@/lib/i18n/locale';
import { pageAlternates } from '@/lib/seo';
import {
  SEASON_PREVIEW_VALUE,
  seasonQueryString,
  seasonTimeContext,
  seasonViews,
  type SeasonPackView,
} from '@/lib/season';
import { seasonPropsForPack } from '@/lib/studio/season-props';
import { formatKstDate } from '@/lib/time';
import type { SeasonPromptKind } from '@/data/season-packs';

// ─────────────────────────────────────────────────────────────
// 시즌팩 안내(/season) — 커밍순 티저의 상세판.
//  · 3팩의 공개 일정·카운트다운·가격·예시 대사와, 오픈 전에 미리 심어 둔
//    AI 프롬프트·누끼 소품 데이터를 숨김 없이 보여 준다(무엇이 나올지 미리 알려 주는 편이 기대를 만든다).
//  · `?preview=season` = 오픈 전 화면 검수용(읽기 전용), `?at=YYYY-MM-DD` = 그날 화면 시뮬레이션.
//    두 파라미터 모두 판매·생성 잠금을 풀지 않는다.
// ─────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return {
    title: '시즌팩 — 크리스마스·새해·설날 | 이모티학',
    description:
      '크리스마스 산타·루돌프·썰매, 2027 새해 폭죽 카운트다운, 설날 한복·복주머니까지. 이모티학 시즌팩 3종의 공개 일정과 미리 보는 AI 프롬프트·누끼 소품.',
    alternates: await pageAlternates('/season'),
  };
}

const KIND_LABEL: Record<SeasonPromptKind, { ko: string; en: string; emoji: string }> = {
  costume: { ko: '복장', en: 'Outfit', emoji: '👕' },
  prop: { ko: '소품', en: 'Prop', emoji: '🎁' },
  background: { ko: '배경', en: 'Background', emoji: '🖼️' },
  pose: { ko: '포즈', en: 'Pose', emoji: '🕺' },
};

const KIND_ORDER: SeasonPromptKind[] = ['costume', 'prop', 'background', 'pose'];

function StageBadge({ view, locale }: { view: SeasonPackView; locale: 'ko' | 'en' }) {
  const open = view.stage === 'open';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${
        open ? 'border-mint/30 bg-mint/10 text-mint' : 'border-primary/20 bg-primary/[0.07] text-primary-dark'
      }`}
    >
      {open ? <Sparkles className="h-3 w-3" aria-hidden="true" /> : <Lock className="h-3 w-3" aria-hidden="true" />}
      {locale === 'en' ? view.badgeEn : view.badge}
    </span>
  );
}

function PackCard({
  view,
  nowIso,
  query,
  locale,
}: {
  view: SeasonPackView;
  nowIso: string;
  query: string;
  locale: 'ko' | 'en';
}) {
  const t = (ko: string, en: string) => tr(locale, ko, en);
  const { pack } = view;
  const props = seasonPropsForPack(pack.id);
  const open = view.stage === 'open';

  return (
    <section
      id={pack.id}
      aria-labelledby={`${pack.id}-title`}
      className="scroll-mt-24 overflow-hidden rounded-[1.7rem] border border-line/80 bg-white shadow-card"
    >
      <div className={`relative overflow-hidden bg-gradient-to-br ${pack.accent.from} ${pack.accent.to} px-4 py-4 sm:px-6 sm:py-5`}>
        <span aria-hidden="true" className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/20 blur-xl" />
        <span aria-hidden="true" className="absolute bottom-[-40px] left-10 h-24 w-24 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/80">
              {t(`시즌팩 ${pack.order} · ${pack.cuts}컷`, `Season ${pack.order} · ${pack.cuts} cuts`)}
            </p>
            <h2 id={`${pack.id}-title`} className="mt-1 break-keep text-[20px] font-extrabold leading-tight tracking-[-0.03em] text-white sm:text-[24px]">
              <span aria-hidden="true" className="mr-1.5">{pack.emoji}</span>
              {locale === 'en' ? pack.titleEn : pack.title}
            </h2>
            <p className="mt-1 break-keep text-[12.5px] font-bold text-white/90">
              {locale === 'en' ? pack.headlineEn : pack.headline}
            </p>
          </div>
          <span className="relative h-[74px] w-[74px] shrink-0 rounded-2xl border border-white/40 bg-white/20 p-1.5 backdrop-blur">
            <SeasonPropArt id={pack.propIds[0] ?? ''} title={pack.title} />
          </span>
        </div>
        <div className="relative mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-white/90">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 backdrop-blur">
            <CalendarClock className="h-3 w-3" aria-hidden="true" />
            {open
              ? t(`${view.openLabel} 오픈`, `Open since ${view.openLabelEn}`)
              : t(`${view.openLabel} 오픈 예정`, `Opens ${view.openLabelEn}`)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 backdrop-blur">
            <Tag className="h-3 w-3" aria-hidden="true" />
            {locale === 'en' ? pack.priceLabelEn : pack.priceLabel}
          </span>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border border-line/80 bg-cream/60 px-3.5 py-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-sub/80">
              {open ? t('지금 오픈', 'OPEN NOW') : t('오픈까지', 'UNTIL OPEN')}
            </p>
            <p className={`mt-1 ${pack.accent.ink}`}>
              {open ? (
                <span className="text-[24px] font-extrabold leading-none tracking-[-0.03em]">D-DAY</span>
              ) : (
                <SeasonCountdownClock targetIso={view.targetAt} nowIso={nowIso} size="md" />
              )}
            </p>
          </div>
          <StageBadge view={view} locale={locale} />
          {open ? (
            <Link href={localizedPath(locale, `/studio/photo?season=${pack.id}`)} className="btn-primary !px-4 !py-2.5 text-[13px]">
              {t('내 사진에 소품 얹기', 'Add props to my photo')} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ) : (
            <Link
              href={`/season?preview=${SEASON_PREVIEW_VALUE}${query.includes('at=') ? `&${query.replace(/^\?/, '')}` : ''}#${pack.id}`}
              className="btn-ghost !px-4 !py-2.5 text-[12px]"
            >
              {t('미리보기 모드로 확인', 'Open preview mode')}
            </Link>
          )}
        </div>

        <p className="mt-4 break-keep text-[13px] leading-relaxed text-sub">{locale === 'en' ? pack.taglineEn : pack.tagline}</p>

        {/* 미리 심어 둔 AI 프롬프트 — 오픈일에 그대로 생성에 쓰인다 */}
        <div className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-[13px] font-extrabold tracking-[-0.01em]">
              <span aria-hidden="true" className="h-4 w-1 rounded-full brand-gradient" />
              {t('AI 프롬프트 (미리 탑재)', 'AI prompts (preloaded)')}
            </h3>
            <span className="text-[10px] font-bold text-sub">{pack.prompts.length} {t('종', 'items')}</span>
          </div>
          <div className="mt-2 space-y-2">
            {KIND_ORDER.map((kind) => {
              const items = pack.prompts.filter((prompt) => prompt.kind === kind);
              if (!items.length) return null;
              return (
                <div key={kind} className="rounded-[1.1rem] border border-line/80 bg-white p-2.5">
                  <p className="text-[10.5px] font-black uppercase tracking-[0.1em] text-sub/90">
                    <span aria-hidden="true" className="mr-1">{KIND_LABEL[kind].emoji}</span>
                    {locale === 'en' ? KIND_LABEL[kind].en : KIND_LABEL[kind].ko}
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    {items.map((item) => (
                      <li key={item.id} className="rounded-xl bg-cream/60 px-2.5 py-2">
                        <p className="text-[11.5px] font-extrabold text-ink">{locale === 'en' ? item.labelEn : item.label}</p>
                        <p className="mt-0.5 break-words font-mono text-[10px] leading-relaxed text-sub">{item.prompt}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* 누끼 소품 — /studio/photo 데코 영역에 오픈일에 열린다 */}
        <div className="mt-4">
          <h3 className="flex items-center gap-1.5 text-[13px] font-extrabold tracking-[-0.01em]">
            <span aria-hidden="true" className="h-4 w-1 rounded-full brand-gradient" />
            {t('누끼 소품 (사진에 얹기)', 'Cutout props')}
            {!open ? (
              <span className="ml-1 inline-flex items-center gap-0.5 rounded-full border border-primary/20 bg-primary/[0.06] px-1.5 py-0.5 text-[9px] font-black text-primary-dark">
                <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                {t('오픈일에 열림', 'Locked until open')}
              </span>
            ) : null}
          </h3>
          <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {props.map((prop) => (
              <li key={prop.id} className={`rounded-[1.1rem] border border-line/80 p-2 text-center ${pack.accent.soft}`}>
                <span className="mx-auto block h-11 w-11">
                  <SeasonPropArt id={prop.id} title={prop.label} />
                </span>
                <span className="mt-1 block break-keep text-[10px] font-black leading-tight text-ink">
                  {locale === 'en' ? prop.labelEn : prop.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* 예시 대사 */}
        <div className="mt-4">
          <h3 className="text-[11px] font-black uppercase tracking-[0.12em] text-sub/80">{t('이런 대사로 나와요', 'Sample lines')}</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {pack.lines.map((line) => (
              <li key={line.line} className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-bold text-ink">
                <span aria-hidden="true">{line.emoji}</span>
                {locale === 'en' ? line.lineEn : line.line}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default async function SeasonPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string; at?: string }>;
}) {
  const [params, locale] = await Promise.all([searchParams, getLocale()]);
  const context = seasonTimeContext(params);
  const views = seasonViews(context.now, context.preview);
  const nowIso = context.now.toISOString();
  const query = seasonQueryString(context);
  const t = (ko: string, en: string) => tr(locale, ko, en);

  const nextView = [...views]
    .filter((view) => view.stage !== 'closed' && view.stage !== 'open')
    .sort((a, b) => a.targetMs - b.targetMs)[0];
  const openNow = views.filter((view) => view.stage === 'open');

  return (
    <main className="pb-16">
      <section className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="mesh-hero pointer-events-none absolute inset-0 -z-10" />
        <div aria-hidden="true" className="hero-grid pointer-events-none absolute inset-0 -z-10" />
        <div className="wrap pb-6 pt-6 sm:pb-9 sm:pt-9">
          <nav className="flex items-center gap-2 text-[11px] font-bold text-sub" aria-label={t('현재 위치', 'Breadcrumb')}>
            <Link href={localizedPath(locale, '/')} className="hover:text-ink">{t('홈', 'Home')}</Link>
            <span aria-hidden="true" className="text-sub/35">/</span>
            <span className="text-ink">{t('시즌팩', 'Season packs')}</span>
          </nav>

          <header className="mt-4 max-w-2xl">
            <p className="eyebrow">SEASON PACKS 2026–2027</p>
            <h1 className="mt-2 break-keep text-[1.8rem] font-extrabold leading-[1.2] tracking-[-0.04em] text-ink sm:text-[2.3rem]">
              {t('크리스마스도, 새해도', 'Christmas, New Year,')}
              <br />
              <span className="text-gradient">{t('내 얼굴로 미리 준비', 'and Lunar New Year — as you')}</span>
            </h1>
            <p className="mt-3 break-keep text-[13.5px] leading-relaxed text-sub sm:text-sm">
              {t(
                '세 시즌팩은 정해진 날에 한꺼번에 열려요. 프롬프트와 소품은 이미 준비해 두었고, 오픈일에 한 번에 쓸 수 있어요.',
                'All three packs open on set dates. Prompts and props are already loaded and unlock on the day.',
              )}
            </p>
          </header>

          {/* 다음 오픈 카운트다운 */}
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            <div className="rounded-[1.4rem] border border-line/80 bg-white/90 p-4 shadow-card backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-sub/80">
                {nextView ? t('다음 오픈', 'NEXT OPEN') : t('지금 오픈', 'OPEN NOW')}
              </p>
              {nextView ? (
                <>
                  <p className="mt-1.5 break-keep text-[15px] font-extrabold tracking-[-0.02em]">
                    <span aria-hidden="true" className="mr-1">{nextView.pack.emoji}</span>
                    {locale === 'en' ? nextView.pack.titleEn : nextView.pack.title}
                  </p>
                  <p className={`mt-2 ${nextView.pack.accent.ink}`}>
                    <SeasonCountdownClock targetIso={nextView.targetAt} nowIso={nowIso} size="lg" />
                  </p>
                  <p className="mt-1 text-[10.5px] font-bold text-sub">
                    {nextView.stage === 'upcoming'
                      ? t(`${nextView.teaseLabel} 티저 공개 → ${nextView.openLabel} 오픈`, `Teaser ${nextView.teaseLabelEn} → opens ${nextView.openLabelEn}`)
                      : t(`티저 공개 중 · ${nextView.openLabel} 오픈`, `Teaser live · opens ${nextView.openLabelEn}`)}
                  </p>
                </>
              ) : (
                <p className="mt-1.5 text-[15px] font-extrabold">
                  {openNow.map((view) => (locale === 'en' ? view.pack.titleEn : view.pack.title)).join(' · ')}
                </p>
              )}
            </div>

            <div className="rounded-[1.4rem] border border-line/80 bg-white/90 p-4 shadow-card backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-sub/80">{t('오픈 캘린더', 'OPENING CALENDAR')}</p>
              <ul className="mt-2 space-y-1.5">
                {views.map((view) => (
                  <li key={view.pack.id} className="flex items-center justify-between gap-2 text-[11.5px] font-bold">
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <span aria-hidden="true">{view.pack.emoji}</span>
                      <span className="truncate">{locale === 'en' ? view.pack.titleEn : view.pack.title}</span>
                    </span>
                    <span className={view.stage === 'open' ? 'text-mint' : 'text-sub'}>
                      {view.stage === 'open' ? t('오픈', 'OPEN') : `${view.openLabelEn.replace('/', '.')}`}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] leading-relaxed text-sub/80">
                {t(`기준 시각 ${formatKstDate(context.now)} KST`, `As of ${formatKstDate(context.now)} KST`)}
              </p>
            </div>
          </div>

          {/* 검수 모드 안내 — 대표님이 오픈 전 화면을 확인할 때만 쓰는 링크 */}
          <div className="mt-3 rounded-[1.2rem] border border-dashed border-primary/25 bg-primary/[0.04] px-3.5 py-2.5">
            <p className="text-[10.5px] font-bold leading-relaxed text-sub">
              <span className="font-black text-primary-dark">
                {context.preview ? t('미리보기 모드 켜짐', 'Preview mode ON') : t('오픈 전 미리보기', 'Before launch')}
              </span>
              {' · '}
              {t(
                '오픈 전 화면은 /season?preview=season 으로, 특정 날짜 화면은 &at=2026-12-05 처럼 확인해요. 미리보기는 판매·생성 잠금을 풀지 않아요.',
                'Check pre-launch screens at /season?preview=season, or a specific day with &at=2026-12-05. Preview never unlocks sales.',
              )}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Link href="/season" className="rounded-full border border-line bg-white px-2.5 py-1 text-[10.5px] font-black text-sub hover:text-ink">
                {t('실제 오늘 화면', 'Real today')}
              </Link>
              <Link href={`/season?preview=${SEASON_PREVIEW_VALUE}`} className="rounded-full border border-primary/30 bg-white px-2.5 py-1 text-[10.5px] font-black text-primary-dark">
                {t('미리보기 모드', 'Preview mode')}
              </Link>
              {['2026-12-05', '2026-12-11', '2026-12-30', '2027-01-15'].map((day) => (
                <Link
                  key={day}
                  href={`/season?at=${day}`}
                  className="rounded-full border border-line bg-white px-2.5 py-1 text-[10.5px] font-bold text-sub hover:text-ink"
                >
                  {day}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="wrap space-y-4">
        {views.map((view) => (
          <PackCard key={view.pack.id} view={view} nowIso={nowIso} query={query} locale={locale} />
        ))}

        <section className="rounded-[1.5rem] border border-line/80 bg-cream/70 p-4 text-[11.5px] leading-relaxed text-sub sm:p-5">
          <h2 className="text-[13px] font-extrabold text-ink">{t('오픈일에 이렇게 열려요', 'How it opens')}</h2>
          <ul className="mt-2 space-y-1.5">
            <li>· {t('오픈일 00:00(KST)이 되면 홈·만들기 허브의 카드가 자동으로 ‘오픈’으로 바뀌어요.', 'At 00:00 KST on opening day the cards switch to open automatically.')}</li>
            <li>· {t('`/studio/photo`의 시즌 소품 잠금이 풀려 사진에 바로 얹을 수 있어요.', 'Season props unlock in /studio/photo and can be added to your photo.')}</li>
            <li>· {t('AI 컷 만들기의 시즌 악세사리(산타 모자·루돌프 뿔 등)도 함께 열려요.', 'Season AI accessories (Santa hat, reindeer antlers) unlock too.')}</li>
            <li>· {t('가격은 기존과 같아요 — 12컷 완성권 5,900원, 크레딧 팩 동일.', 'Pricing stays the same: ₩5,900 per 12-cut completion.')}</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
