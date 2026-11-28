import Link from 'next/link';
import {
  Camera,
  ChevronRight,
  FolderOpen,
  MessageCircle,
  MessageSquareText,
  ShoppingBag,
  Sparkles,
  Sun,
} from 'lucide-react';
import { ACCESSORIES } from '@/lib/accessories';
import { getCurrentUser } from '@/lib/session';
import { aiAccess, canUseAiGeneration } from '@/lib/admin-access';
import { getLocale } from '@/lib/i18n/server';
import { localizedPath, tr } from '@/lib/i18n/locale';
import { DRIP_LINE_COUNT, DRIP_THEME_COUNT } from '@/data/drip-themes';
import { PRESET_COUNT } from '@/data/emoticon-presets-150';
import { CURATION_PACKAGES } from '@/data/curation-packages';
import { SeasonTeaser } from '@/components/season/SeasonTeaser';
import { seasonQueryString, seasonTeaserViews, seasonTimeContext } from '@/lib/season';
import { pageAlternates } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const locale = await getLocale();
  return {
    title: locale === 'en' ? 'Create — pick how you want to make stickers | EmotiHak' : '만들기 — 어떤 방법으로 만들까요? | 이모티학',
    description:
      locale === 'en'
        ? 'Three ways to make stickers: cut your photo out for free, redraw it as an AI character pack, or start from 150 expression presets and 66 drip lines.'
        : '내 사진 누끼로 바로 저장하기, AI 캐릭터로 12컷 그리기, 150종 프리셋·66종 드립으로 만들기 — 세 가지 방법을 한 화면에서 고르세요.',
    alternates: await pageAlternates('/studio'),
  };
}

/**
 * 만들기 허브(/studio).
 *  · 하단 '만들기' 탭이 닿는 한 곳에서 3가지 제작 방식을 카드로 고르게 한다.
 *  · 기존 직접 경로(/studio/photo · /studio/upload)는 그대로 살아 있다.
 *  · 2026 리뉴얼: 민무늬 흰 배경 → 메시 그라데이션 히어로 + 그라데이션 아이콘 타일 카드.
 */
export default async function StudioHubPage({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string; at?: string }>;
} = {}) {
  const [locale, user, params] = await Promise.all([
    getLocale(),
    getCurrentUser(),
    searchParams ?? Promise.resolve({} as { preview?: string; at?: string }),
  ]);
  // 시즌팩 커밍순 — 홈과 같은 판정(src/lib/season.ts)을 쓴다. 오픈일이 되면 여기서도 '오픈'.
  const seasonTime = seasonTimeContext(params);
  const seasonViews = seasonTeaserViews(seasonTime.now, seasonTime.preview);
  const seasonQuery = seasonQueryString(seasonTime);
  const seasonNowIso = seasonTime.now.toISOString();
  const aiEnabled = canUseAiGeneration(user);
  const trial = aiAccess(user) === 'trial';
  const t = (ko: string, en: string) => tr(locale, ko, en);
  const lp = (href: string) => localizedPath(locale, href);

  const routes = [
    {
      Icon: Camera,
      tile: 'from-[#8B5CF6] to-[#6E29F5]',
      glow: 'shadow-[0_12px_26px_-14px_rgba(110,41,245,0.9)]',
      accent: 'text-mint',
      badge: t('무료 · AI 생성 없이', 'Free · no AI'),
      title: t('내 사진 바로 스티커', 'Photo sticker, no AI'),
      desc: t(
        '올린 사진 그대로 배경만 떼고 글자 한 줄을 얹어 카톡에 바로 붙일 수 있게 저장해요. 사진은 서버로 보내지 않고 크레딧도 쓰지 않아요.',
        'Cut the background out of your own photo, add one hand-lettered line, and save a 360×360 transparent PNG. Your photo never leaves the device and no credits are used.',
      ),
      meta: t('사진 1장 · 최대 12장 팩 · 카카오 규격 ZIP', '1 photo · up to 12 in a pack · Kakao ZIP'),
      href: '/studio/photo',
      cta: t('사진 올리고 바로 만들기', 'Start with a photo'),
      secondary: null as null | { href: string; label: string },
    },
    {
      Icon: Sparkles,
      tile: 'from-[#6E29F5] via-[#A855F7] to-[#FF4D8D]',
      glow: 'shadow-[0_12px_26px_-14px_rgba(168,85,247,0.9)]',
      accent: 'text-primary-dark',
      badge: aiEnabled ? t(trial ? '4컷 무료 미리보기' : 'AI · 12컷', trial ? 'Free 4-cut preview' : 'AI · 12 cuts') : t('준비 중', 'Setting up'),
      title: t('AI 캐릭터로 새로 그리기', 'Redraw as an AI character'),
      desc: t(
        '내 사진을 웹툰·인형·3D 그림체로 다시 그려 12컷 표정 팩을 만들어요. 4컷을 무료로 먼저 그려 드리고, 마음에 들면 12컷으로 완성해요.',
        'Redraw your photo in webtoon, clay or 3D styles and get a 12-cut expression pack. Four cuts are drawn free first; unlock to finish all 12.',
      ),
      meta: t('사진 1장(커플 2장) · 그림 스타일 11종 · 12컷', '1 photo (2 for couples) · 11 styles · 12 cuts'),
      href: aiEnabled ? '/studio/upload' : '/quotes',
      cta: aiEnabled ? t('AI로 만들기', 'Create with AI') : t('대사로 만들기', 'Start from a line'),
      secondary: aiEnabled ? null : { href: '/studio/upload', label: t('AI 스튜디오 (준비 중)', 'AI studio (coming soon)') },
    },
    {
      Icon: MessageSquareText,
      tile: 'from-[#FF9F5A] to-[#FF4D8D]',
      glow: 'shadow-[0_12px_26px_-14px_rgba(255,77,141,0.85)]',
      accent: 'text-primary-dark',
      badge: t(`프리셋 ${PRESET_COUNT}`, `${PRESET_COUNT} presets`),
      title: t('대사·드립 프리셋으로 만들기', 'Start from lines & presets'),
      desc: t(
        `표정·포즈·대사가 한 묶음인 프리셋 ${PRESET_COUNT}종과 짧은 대사 ${DRIP_LINE_COUNT}종에서 골라 바로 만들 수 있어요. 그림을 직접 그리지 않아도 돼요.`,
        `Pick from ${PRESET_COUNT} expression presets and ${DRIP_THEME_COUNT} drip themes (${DRIP_LINE_COUNT} lines) and turn them into stickers without drawing anything.`,
      ),
      meta: t(`프리셋 ${PRESET_COUNT} · 대사 ${DRIP_LINE_COUNT} · 모음 ${CURATION_PACKAGES.length}종`, `${PRESET_COUNT} presets · ${DRIP_LINE_COUNT} lines · ${CURATION_PACKAGES.length} sets`),
      href: '/quotes',
      cta: t('대사 스튜디오 열기', 'Open line studio'),
      secondary: { href: '/presets', label: t(`프리셋 ${PRESET_COUNT} 보기`, `Browse presets`) },
    },
  ];

  const quickLinks = [
    { href: '/studio/packs', Icon: FolderOpen, label: t('내 팩', 'My packs') },
    { href: '/presets', Icon: Sparkles, label: t('프리셋 150', 'Presets 150') },
    { href: '/reply', Icon: MessageCircle, label: t('톡 답장', 'Reply') },
    { href: '/brief', Icon: Sun, label: t('오늘의 브리핑', 'Daily brief') },
    { href: '/goods', Icon: ShoppingBag, label: t('굿즈', 'Goods') },
  ];

  return (
    <main className="pb-14">
      <section className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="mesh-hero pointer-events-none absolute inset-0 -z-10 opacity-90" />
        <div aria-hidden="true" className="hero-grid pointer-events-none absolute inset-0 -z-10" />
        <div className="wrap pb-8 pt-5 sm:pb-10 sm:pt-8">
          <nav className="flex items-center gap-2 text-[11px] font-bold text-sub" aria-label={t('현재 위치', 'Breadcrumb')}>
            <Link href={lp('/')} className="hover:text-ink">{t('홈', 'Home')}</Link>
            <span aria-hidden="true" className="text-sub/35">/</span>
            <span className="text-ink">{t('만들기', 'Create')}</span>
          </nav>

          <header className="mt-4 max-w-2xl">
            <p className="eyebrow">CREATE HUB</p>
            <h1 className="mt-2 break-keep text-[1.75rem] font-extrabold leading-[1.22] tracking-[-0.035em] text-ink sm:text-[2.15rem]">
              {t('무엇으로 만들까요?', 'How do you want to make it?')}
            </h1>
            <p className="mt-2 break-keep text-[13.5px] leading-relaxed text-sub sm:text-sm">
              {t(
                '세 가지 방법 중 하나만 고르면 돼요. 사진이 없어도 대사·프리셋으로 바로 만들 수 있어요.',
                'Pick one of three ways. You can create right away with lines and presets even without a photo.',
              )}
            </p>
          </header>
        </div>
      </section>

      <div className="wrap">
        <ul className="-mt-4 grid gap-3 sm:-mt-5 md:grid-cols-3">
          {routes.map((route) => {
            const Icon = route.Icon;
            return (
              <li key={route.title} className="min-w-0">
                <article className="group relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-line/80 bg-white p-4 shadow-card transition duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-pop sm:p-5">
                  <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-primary/[0.05] blur-2xl transition group-hover:bg-hot/[0.1]" />
                  <div className="relative flex items-start justify-between gap-2">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[1rem] bg-gradient-to-br text-white ${route.tile} ${route.glow}`}>
                      <Icon className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
                    </span>
                    <span className={`rounded-full border border-line/80 bg-cream/80 px-2.5 py-1 text-[10px] font-black ${route.accent}`}>{route.badge}</span>
                  </div>
                  <h2 className="mt-3.5 break-keep text-[17px] font-extrabold leading-snug tracking-[-0.025em]">{route.title}</h2>
                  <p className="mt-1.5 flex-1 break-keep text-[13px] leading-relaxed text-sub">{route.desc}</p>
                  <p className="mt-3 text-[10.5px] font-bold leading-relaxed text-sub/90">{route.meta}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={lp(route.href)} className="btn-primary !px-4 !py-2.5 text-[13px]">
                      {route.cta} <span aria-hidden="true">→</span>
                    </Link>
                    {route.secondary ? (
                      <Link href={lp(route.secondary.href)} className="btn-ghost !px-4 !py-2.5 text-[12px]">{route.secondary.label}</Link>
                    ) : null}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>

        <SeasonTeaser views={seasonViews} nowIso={seasonNowIso} locale={locale} query={seasonQuery} variant="hub" />

        <section className="mt-8" aria-labelledby="quick-title">
          <h2 id="quick-title" className="text-[10.5px] font-black uppercase tracking-[0.16em] text-sub/80">{t('바로 가기', 'Shortcuts')}</h2>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {quickLinks.map((link) => {
              const Icon = link.Icon;
              return (
                <Link
                  key={link.href}
                  href={lp(link.href)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line/80 bg-white px-3 py-1.5 text-[11.5px] font-bold text-sub shadow-card transition hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary-dark"
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {link.label}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="relative mt-8 overflow-hidden rounded-[1.5rem] border border-line/80 bg-white p-4 shadow-card sm:p-5" aria-labelledby="tip-title">
          <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-primary/[0.07] blur-2xl" />
          <h2 id="tip-title" className="flex items-center gap-2 text-base font-extrabold tracking-[-0.02em]">
            <span aria-hidden="true" className="h-4 w-1 rounded-full brand-gradient" />
            {t('만든 뒤에는', 'After you make it')}
          </h2>
          <p className="mt-2 break-keep text-[13px] leading-relaxed text-sub">
            {t(
              '내 팩에서 컷을 편집하고 PNG·ZIP으로 내려받을 수 있어요. 표정·문구·악세사리는 최대 3개까지 바꿀 수 있어요.',
              'Edit cuts and download PNG or ZIP from My packs. Expressions, lines and up to 3 accessories can be changed.',
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label={t('악세사리 예시', 'Accessory examples')}>
            {ACCESSORIES.slice(0, 4).map((item) => (
              <span key={item.id} className="inline-flex items-center gap-1 rounded-full border border-line/80 bg-cream/70 px-2.5 py-1 text-[10.5px] font-bold text-sub">
                <span aria-hidden="true">{item.emoji}</span> {item.name}
              </span>
            ))}
          </div>
          <Link href={lp('/studio/packs')} className="group mt-4 inline-flex items-center gap-1 text-sm font-black text-primary-dark">
            {t('내 팩 열기', 'Open my packs')}
            <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </section>
      </div>
    </main>
  );
}
