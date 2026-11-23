import Link from 'next/link';
import { ACCESSORIES } from '@/lib/accessories';
import { getCurrentUser } from '@/lib/session';
import { aiAccess, canUseAiGeneration } from '@/lib/admin-access';
import { getLocale } from '@/lib/i18n/server';
import { localizedPath, tr } from '@/lib/i18n/locale';
import { DRIP_LINE_COUNT, DRIP_THEME_COUNT } from '@/data/drip-themes';
import { PRESET_COUNT } from '@/data/emoticon-presets-150';
import { CURATION_PACKAGES } from '@/data/curation-packages';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const locale = await getLocale();
  return {
    title: locale === 'en' ? 'Create — pick how you want to make stickers | EmotiHak' : '만들기 — 어떤 방법으로 만들까요? | 이모티학',
    description:
      locale === 'en'
        ? 'Three ways to make stickers: cut your photo out for free, redraw it as an AI character pack, or start from 150 expression presets and 66 drip lines.'
        : '내 사진 누끼로 바로 저장하기, AI 캐릭터로 12컷 그리기, 150종 프리셋·66종 드립으로 만들기 — 세 가지 방법을 한 화면에서 고르세요.',
  };
}

/**
 * 만들기 허브(/studio).
 *  · 하단 '만들기' 탭이 닿는 한 곳에서 3가지 제작 방식을 카드로 고르게 한다.
 *  · 기존 직접 경로(/studio/photo · /studio/upload)는 그대로 살아 있다.
 */
export default async function StudioHubPage() {
  const locale = await getLocale();
  const user = await getCurrentUser();
  const aiEnabled = canUseAiGeneration(user);
  const trial = aiAccess(user) === 'trial';
  const t = (ko: string, en: string) => tr(locale, ko, en);
  const lp = (href: string) => localizedPath(locale, href);

  const routes = [
    {
      emoji: '📸',
      badge: t('무료 · AI 생성 없이', 'Free · no AI'),
      title: t('내 사진 바로 스티커', 'Photo sticker, no AI'),
      desc: t(
        '올린 사진 그대로 배경만 떼고 캘리그라피 한 줄을 얹어 360×360 투명 PNG로 바로 저장해요. 사진은 서버로 보내지 않고 크레딧도 쓰지 않아요.',
        'Cut the background out of your own photo, add one hand-lettered line, and save a 360×360 transparent PNG. Your photo never leaves the device and no credits are used.',
      ),
      meta: t('사진 1장 · 최대 12장 팩 · 카카오 규격 ZIP', '1 photo · up to 12 in a pack · Kakao ZIP'),
      href: '/studio/photo',
      cta: t('사진 올리고 바로 만들기', 'Start with a photo'),
      secondary: null as null | { href: string; label: string },
    },
    {
      emoji: '🎨',
      badge: aiEnabled ? t(trial ? '12컷 무료 미리보기' : 'AI · 12컷', trial ? 'Free 12-cut preview' : 'AI · 12 cuts') : t('준비 중', 'Setting up'),
      title: t('AI 캐릭터로 새로 그리기', 'Redraw as an AI character'),
      desc: t(
        '내 사진을 웹툰·인형·3D 화풍으로 다시 그려 12컷 표정 팩을 만들어요. 시안을 먼저 보고 마음에 들면 진행해요.',
        'Redraw your photo in webtoon, clay or 3D styles and get a 12-cut expression pack. Check one draft before you commit.',
      ),
      meta: t('사진 1장(커플 2장) · 9가지 화풍 · 12·24·32컷', '1 photo (2 for couples) · 9 styles · 12/24/32 cuts'),
      href: aiEnabled ? '/studio/upload' : '/quotes',
      cta: aiEnabled ? t('AI로 만들기', 'Create with AI') : t('대사로 만들기', 'Start from a line'),
      secondary: aiEnabled ? null : { href: '/studio/upload', label: t('AI 스튜디오 (준비 중)', 'AI studio (coming soon)') },
    },
    {
      emoji: '💬',
      badge: t(`프리셋 ${PRESET_COUNT}`, `${PRESET_COUNT} presets`),
      title: t('대사·드립 프리셋으로 만들기', 'Start from lines & presets'),
      desc: t(
        `표정·포즈·대사가 한 묶음인 프리셋 ${PRESET_COUNT}종과 드립 ${DRIP_THEME_COUNT}테마 ${DRIP_LINE_COUNT}종에서 골라 바로 이모티콘을 만들어요. 그림을 직접 그리지 않아도 돼요.`,
        `Pick from ${PRESET_COUNT} expression presets and ${DRIP_THEME_COUNT} drip themes (${DRIP_LINE_COUNT} lines) and turn them into stickers without drawing anything.`,
      ),
      meta: t(`프리셋 ${PRESET_COUNT} · 드립 ${DRIP_LINE_COUNT} · 큐레이션 ${CURATION_PACKAGES.length}종`, `${PRESET_COUNT} presets · ${DRIP_LINE_COUNT} lines · ${CURATION_PACKAGES.length} curated sets`),
      href: '/quotes',
      cta: t('대사 스튜디오 열기', 'Open line studio'),
      secondary: { href: '/presets', label: t(`프리셋 ${PRESET_COUNT} 보기`, `Browse presets`) },
    },
  ];

  const quickLinks = [
    { href: '/studio/packs', emoji: '📦', label: t('내 팩', 'My packs') },
    { href: '/presets', emoji: '🗂️', label: t('프리셋 150', 'Presets 150') },
    { href: '/reply', emoji: '💌', label: t('톡 답장', 'Reply') },
    { href: '/brief', emoji: '☀️', label: t('오늘의 브리핑', 'Daily brief') },
    { href: '/goods', emoji: '🛍️', label: t('굿즈', 'Goods') },
  ];

  return (
    <main className="wrap pb-14 pt-6 sm:pt-10">
      <nav className="mb-5 flex items-center gap-2 text-xs font-bold text-sub" aria-label={t('현재 위치', 'Breadcrumb')}>
        <Link href={lp('/')} className="hover:text-ink">{t('홈', 'Home')}</Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink">{t('만들기', 'Create')}</span>
      </nav>

      <header className="max-w-2xl">
        <h1 className="h2">{t('무엇으로 만들까요?', 'How do you want to make it?')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-sub">
          {t(
            '세 가지 방법 중 하나만 고르면 돼요. 사진이 없어도 대사·프리셋으로 바로 만들 수 있어요.',
            'Pick one of three ways. You can create right away with lines and presets even without a photo.',
          )}
        </p>
      </header>

      <ul className="mt-6 grid gap-3 md:grid-cols-3">
        {routes.map((route) => (
          <li key={route.title} className="min-w-0">
            <article className="card flex h-full flex-col border border-line p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lemon/40 text-2xl">{route.emoji}</span>
                <span className="chip !bg-cream !text-[11px]">{route.badge}</span>
              </div>
              <h2 className="mt-3 text-lg font-black leading-snug tracking-tight">{route.title}</h2>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-sub">{route.desc}</p>
              <p className="mt-3 text-[11px] font-bold leading-relaxed text-sub">{route.meta}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={lp(route.href)} className="btn-primary !py-2.5 text-sm">{route.cta} <span aria-hidden="true">→</span></Link>
                {route.secondary ? (
                  <Link href={lp(route.secondary.href)} className="btn-ghost !py-2.5 text-sm">{route.secondary.label}</Link>
                ) : null}
              </div>
            </article>
          </li>
        ))}
      </ul>

      <section className="mt-8" aria-labelledby="quick-title">
        <h2 id="quick-title" className="text-sm font-black text-sub">{t('바로 가기', 'Shortcuts')}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {quickLinks.map((link) => (
            <Link key={link.href} href={lp(link.href)} className="chip !bg-paper !py-2 hover:border-primary hover:text-primary-dark">
              <span aria-hidden="true">{link.emoji}</span> {link.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-paper p-4 sm:p-5" aria-labelledby="tip-title">
        <h2 id="tip-title" className="text-base font-black">{t('만든 뒤에는', 'After you make it')}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-sub">
          {t(
            '내 팩에서 컷을 편집하고 PNG·ZIP으로 내려받을 수 있어요. 표정·문구·악세사리는 최대 3개까지 바꿀 수 있어요.',
            'Edit cuts and download PNG or ZIP from My packs. Expressions, lines and up to 3 accessories can be changed.',
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-2" aria-label={t('악세사리 예시', 'Accessory examples')}>
          {ACCESSORIES.slice(0, 4).map((item) => (
            <span key={item.id} className="chip !bg-cream"><span aria-hidden="true">{item.emoji}</span> {item.name}</span>
          ))}
        </div>
        <Link href={lp('/studio/packs')} className="mt-4 inline-block text-sm font-black text-coralink underline underline-offset-4">
          {t('내 팩 열기 →', 'Open my packs →')}
        </Link>
      </section>
    </main>
  );
}
