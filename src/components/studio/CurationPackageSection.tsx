'use client';

// ─────────────────────────────────────────────────────────────
// 표준 고빈도·시즌·관계 큐레이션 (공개 /presets · /en/presets 상단)
//  · 카드를 누르면 24/32컷 구성(순번·표현·대사·기획 의도)이 펼쳐진다.
//  · 패키지 안 카테고리 칩으로 구성 흐름을 걸러 볼 수 있다.
//  · "이 패키지로 팩 만들기"는 고른 패키지를 만들기 화면까지 들고 간다
//    (URL ?package= + sessionStorage).
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import {
  CURATION_PACKAGES,
  curationPackageById,
  curationPackageCategories,
  curationPackageCuts,
  type CurationPackage,
  type CurationPackageGroup,
} from '@/data/curation-packages';
import { localizedPath, tr, type Locale } from '@/lib/i18n/locale';
import { rememberPackagePick, rememberPresetPick } from '@/lib/studio/preset-selection';

function packageTitle(pkg: CurationPackage, locale: Locale) {
  return locale === 'en' ? pkg.titleEn : pkg.title;
}

export function CurationPackageSection({ locale }: { locale: Locale }) {
  const t = (ko: string, en: string) => tr(locale, ko, en);
  const lp = (href: string) => localizedPath(locale, href);
  const [openId, setOpenId] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [group, setGroup] = useState<CurationPackageGroup | 'all'>('all');
  const open = openId ? curationPackageById(openId) ?? null : null;

  const cuts = useMemo(() => (open ? curationPackageCuts(open) : []), [open]);
  const categories = useMemo(() => (open ? curationPackageCategories(open) : []), [open]);
  const visible = category ? cuts.filter((cut) => cut.preset.category === category) : cuts;
  const packages = group === 'all' ? CURATION_PACKAGES : CURATION_PACKAGES.filter((pkg) => pkg.group === group);
  const groups: { id: CurationPackageGroup | 'all'; label: string; count: number }[] = [
    { id: 'all', label: t('전체', 'All'), count: CURATION_PACKAGES.length },
    { id: 'core', label: t('기본', 'Core'), count: CURATION_PACKAGES.filter((pkg) => pkg.group === 'core').length },
    { id: 'season', label: t('시즌', 'Seasonal'), count: CURATION_PACKAGES.filter((pkg) => pkg.group === 'season').length },
    { id: 'relationship', label: t('관계', 'Relationships'), count: CURATION_PACKAGES.filter((pkg) => pkg.group === 'relationship').length },
    { id: 'everyday', label: t('일상·밈', 'Everyday & memes'), count: CURATION_PACKAGES.filter((pkg) => pkg.group === 'everyday').length },
  ];

  return (
    <section aria-labelledby="curation-packages" className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="eyebrow">CURATED SETS · {CURATION_PACKAGES.length}</p>
          <h2 id="curation-packages" className="mt-1 text-lg font-black break-keep sm:text-xl">
            {t(`기본·시즌·관계 큐레이션 ${CURATION_PACKAGES.length}종`, `${CURATION_PACKAGES.length} core, seasonal & relationship sets`)}
          </h2>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-sub">
            {t(
              '기본 고빈도 24컷 1종 · 시즌 6종 · 커플/친구/팀·부서 관계팩을 준비했어요. 반려동물 집사 밈은 위 전용 12컷 팩에서 볼 수 있어요. 구성과 대사를 확인한 뒤 그대로 만들 수 있습니다.',
              'Browse the standardized high-frequency 24, six seasonal sets, and couple/friend/team relationship packs. The dedicated 12-cut pet-butler set is shown above. Review each line-up before creating it.',
            )}
          </p>
        </div>
        <span className="chip !bg-cream shrink-0">{t('한 번에 채우기', 'One tap to fill')}</span>
      </div>

      <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label={t('팩 묶음 필터', 'Filter curated sets')}>
        {groups.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={group === item.id}
            onClick={() => {
              setGroup(item.id);
              setOpenId(null);
              setCategory(null);
            }}
            className={clsx(
              'min-h-9 shrink-0 rounded-full border px-3 text-[11px] font-bold',
              group === item.id ? 'border-ink bg-ink text-cream' : 'border-line bg-paper text-sub',
            )}
          >
            {item.label} <span className="opacity-60">{item.count}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => {
          const expanded = openId === pkg.id;
          const detailId = `curation-${pkg.id}`;
          return (
            <div
              key={pkg.id}
              className={clsx(
                'flex flex-col overflow-hidden rounded-2xl border-2 bg-paper shadow-card transition',
                expanded ? 'border-primary' : 'border-line',
              )}
            >
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={detailId}
                onClick={() => {
                  const next = expanded ? null : pkg.id;
                  setOpenId(next);
                  setCategory(null);
                  // 펼친 구성이 화면 밖(카드 아래)에 있어 바로 보이도록 이동한다.
                  if (next) {
                    window.setTimeout(() => {
                      document.getElementById(`curation-${next}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 80);
                  }
                }}
                className="flex-1 p-3 text-left"
              >
                <span className={clsx('flex items-center gap-1.5 rounded-xl bg-gradient-to-r px-2.5 py-2 text-white', pkg.accent)}>
                  <span aria-hidden="true" className="text-base leading-none">{pkg.emoji}</span>
                  <span className="text-[13px] font-black leading-tight break-keep">{packageTitle(pkg, locale)}</span>
                </span>
                <span className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black text-coralink">
                    {t(`${pkg.count}컷 세트`, `${pkg.count}-cut set`)}
                  </span>
                  <span className="text-[10px] font-bold text-sub">
                    {expanded ? t('구성 접기 ▲', 'Hide line-up ▲') : t('구성 보기 ▼', 'View line-up ▼')}
                  </span>
                </span>
                <span className="mt-1 block text-[11px] leading-snug text-sub break-keep">
                  {locale === 'en' ? pkg.taglineEn : pkg.tagline}
                </span>
                {pkg.seasonalAngle ? (
                  <span className="mt-2 block rounded-lg border border-coral/25 bg-coral/[0.06] px-2 py-1.5 text-[10px] font-bold leading-snug text-coralink">
                    {pkg.recommendedMonth ? `🗓️ ${pkg.recommendedMonth}${t('월 추천 · ', ' month pick · ')}` : '🎄 '}{locale === 'en' ? pkg.seasonalAngleEn : pkg.seasonalAngle}
                  </span>
                ) : null}
              </button>
              <Link
                href={`${lp('/studio/upload')}?package=${pkg.id}`}
                onClick={() => { rememberPackagePick(pkg.id); rememberPresetPick(null); }}
                className="mx-3 mb-3 flex min-h-11 items-center justify-center rounded-xl border-2 border-ink bg-ink px-3 text-[12px] font-black text-cream transition hover:bg-primary hover:border-primary"
              >
                {t('이 패키지로 팩 만들기', 'Make a pack with this set')} <span aria-hidden="true" className="ml-1">→</span>
              </Link>
            </div>
          );
        })}
      </div>

      {open ? (
        <div
          id={`curation-${open.id}`}
          className="mt-3 rounded-2xl border-2 border-primary/40 bg-paper p-3 shadow-card sm:p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wide text-coralink">
                {t('패키지 구성', 'Package line-up')} · {open.count}
              </p>
              <p className="mt-0.5 text-sm font-black break-keep">
                {open.emoji} {packageTitle(open, locale)}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-sub break-keep">
                {locale === 'en' ? open.conceptEn : open.concept}
              </p>
              {open.seasonalAngle ? (
                <p className="mt-2 rounded-lg border border-coral/25 bg-coral/[0.06] px-2.5 py-2 text-[11px] font-bold leading-relaxed text-coralink">
                  {open.recommendedMonth ? `🗓️ ${open.recommendedMonth}${t('월 추천 · ', ' month pick · ')}` : '🎄 '}{locale === 'en' ? open.seasonalAngleEn : open.seasonalAngle}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Link
                href={`${lp('/studio/upload')}?package=${open.id}`}
                onClick={() => { rememberPackagePick(open.id); rememberPresetPick(null); }}
                className="chip min-h-9 !border-primary !bg-primary !text-white !px-2.5 text-[11px]"
              >
                {t('이 패키지로 팩 만들기', 'Use this set')} →
              </Link>
              <button
                type="button"
                onClick={() => setOpenId(null)}
                className="chip min-h-9 !px-2.5 text-[11px]"
              >
                {t('닫기', 'Close')}
              </button>
            </div>
          </div>

          <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label={t('이 패키지의 카테고리', 'Categories in this package')}>
            <button
              type="button"
              aria-pressed={category === null}
              onClick={() => setCategory(null)}
              className={clsx('min-h-9 shrink-0 rounded-full border px-2.5 text-[11px] font-bold', category === null ? 'border-ink bg-ink text-cream' : 'border-line bg-paper text-sub')}
            >
              {t(`전체 ${open.count}`, `All ${open.count}`)}
            </button>
            {categories.map((item) => (
              <button
                key={item.label}
                type="button"
                aria-pressed={category === item.label}
                onClick={() => setCategory(category === item.label ? null : item.label)}
                className={clsx(
                  'min-h-9 shrink-0 whitespace-nowrap rounded-full border px-2.5 text-[11px] font-bold',
                  category === item.label ? 'border-ink bg-ink text-cream' : 'border-line bg-paper text-sub',
                )}
              >
                <span aria-hidden="true">{item.emoji}</span> {locale === 'en' ? item.labelEn : item.label} <span className="opacity-60">{item.count}</span>
              </button>
            ))}
          </div>

          <p className="mt-2 text-[11px] font-bold text-sub">
            {t(`${visible.length}컷 표시 · 순번은 팩의 컷 순서와 같아요`, `${visible.length} cuts · the number is the cut order in the pack`)}
          </p>

          <ol className="mt-2 space-y-1.5">
            {visible.map((cut) => (
              <li key={cut.presetId} className="rounded-xl border border-line bg-cream/60 p-2.5">
                <div className="flex items-start gap-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-[10px] font-black text-cream">{cut.order}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                      <span className="text-[12px] font-black text-ink">
                        {locale === 'en' ? cut.displayLabelEn ?? cut.preset.en.keyword : cut.displayLabel ?? cut.preset.keyword}
                      </span>
                      {cut.slot ? <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-black text-primary-dark">CORE</span> : null}
                      <span className="text-[10px] font-bold text-sub">#{cut.presetId}</span>
                      <span className="text-[11px] font-bold text-cyber">
                        “{locale === 'en' ? cut.lineEn ?? cut.preset.en.dialogue : cut.line ?? cut.preset.dialogue}”
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-sub break-keep">
                      <span className="font-black text-coralink">{t('의도', 'Use')}</span> {locale === 'en' ? cut.intentEn : cut.intent}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug text-sub/90 break-keep">
                      {locale === 'en' ? cut.preset.en.expression : cut.preset.expression} · {locale === 'en' ? cut.preset.en.pose : cut.preset.pose}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-10 mt-3 rounded-xl border border-line bg-paper/95 p-2 backdrop-blur">
            <Link
              href={`${lp('/studio/upload')}?package=${open.id}`}
              onClick={() => { rememberPackagePick(open.id); rememberPresetPick(null); }}
              className="btn-primary min-h-12 w-full !py-3 text-sm"
            >
              {t(`이 패키지로 ${open.count}컷 팩 만들기`, `Make a ${open.count}-cut pack with this set`)} <span aria-hidden="true">→</span>
            </Link>
            <p className="mt-1 text-center text-[10px] leading-relaxed text-sub">
              {t(
                '만들기 화면에서 이 패키지의 컷과 순서가 그대로 채워집니다.',
                'The creation screen arrives with these cuts and this order already filled in.',
              )}
            </p>
          </div>
        </div>
      ) : null}

      <p className="mt-2 text-[10px] leading-relaxed text-sub">
        {t(
          '패키지 컷 순서는 그대로 유지되며, 만든 뒤 컷 구성에서 자유롭게 바꿀 수 있어요.',
          'The cut order stays fixed, and you can still change the configuration before generating.',
        )}
        {' '}
        {open ? null : t('카드를 눌러 구성을 확인해 보세요.', 'Tap a card to see its line-up.')}
      </p>
    </section>
  );
}
