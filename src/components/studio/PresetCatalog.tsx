'use client';

// ─────────────────────────────────────────────────────────────
// 프리셋 150종 둘러보기 (공개 화면)
//  · 카테고리 칩 + 키워드(한/영) 검색 + 카드 목록
//  · 하나를 고르면 표정·포즈·이펙트·대사가 한눈에 보이고,
//    '이 프리셋으로 만들기'가 선택을 들고 만들기 화면으로 넘어간다.
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import {
  PRESET_CATEGORIES,
  presetById,
  presetCategoryLabel,
  presetDialogue,
  presetKeyword,
  searchPresets,
} from '@/data/emoticon-presets-150';
import { localizedPath, tr, type Locale } from '@/lib/i18n/locale';
import { rememberPackagePick, rememberPresetPick } from '@/lib/studio/preset-selection';

export function PresetCatalog({ locale }: { locale: Locale }) {
  const t = (ko: string, en: string) => tr(locale, ko, en);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [pickedId, setPickedId] = useState<number | null>(null);

  const results = useMemo(() => searchPresets({ category, query }), [category, query]);
  const picked = pickedId ? presetById(pickedId) ?? null : null;
  const createHref = localizedPath(locale, picked ? `/studio/upload?preset=${picked.id}` : '/studio/upload');

  return (
    <div>
      <div className="rounded-2xl border border-line bg-paper p-3 shadow-card sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-black">{t('카테고리 · 검색', 'Category & search')}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-sub">
              {t('한국어·영어 키워드로 표정·포즈·대사까지 검색돼요.', 'Search expressions, poses and captions in Korean or English.')}
            </p>
          </div>
          <span className="chip !bg-cream shrink-0">{t('150종', '150 presets')}</span>
        </div>

        <label className="mt-3 block">
          <span className="sr-only">{t('프리셋 검색', 'Search presets')}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('키워드 검색 (예: 환호, 출근, 심쿵)', 'Search (e.g. cheer, commute, heart)')}
            className="min-h-12 w-full rounded-xl border border-line bg-white px-3 text-sm font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
        </label>

        <div className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label={t('프리셋 카테고리', 'Preset categories')}>
          <button
            type="button"
            aria-pressed={category === null}
            onClick={() => setCategory(null)}
            className={clsx('min-h-9 shrink-0 rounded-full border px-2.5 text-[11px] font-bold', category === null ? 'border-ink bg-ink text-cream' : 'border-line bg-paper text-sub')}
          >
            {t('전체 150', 'All 150')}
          </button>
          {PRESET_CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={category === item.label}
              onClick={() => setCategory(category === item.label ? null : item.label)}
              className={clsx(
                'min-h-9 shrink-0 whitespace-nowrap rounded-full border px-2.5 text-[11px] font-bold',
                category === item.label ? 'border-ink bg-ink text-cream' : 'border-line bg-paper text-sub',
              )}
            >
              <span aria-hidden="true">{item.emoji}</span> {presetCategoryLabel(item, locale)} <span className="opacity-60">{item.count}</span>
            </button>
          ))}
        </div>

        <p className="mt-2 text-[11px] font-bold text-sub">{t(`${results.length}종 표시`, `${results.length} presets`)}</p>

        <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((preset) => {
            const selected = pickedId === preset.id;
            return (
              <li key={preset.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setPickedId(selected ? null : preset.id)}
                  className={clsx(
                    'h-full w-full rounded-xl border-2 p-2.5 text-left transition',
                    selected ? 'border-primary bg-primary/10 ring-4 ring-primary/10' : 'border-line bg-paper hover:-translate-y-0.5 hover:border-primary/50',
                  )}
                >
                  <span className="flex items-start justify-between gap-1">
                    <span className="text-[12px] font-black leading-tight text-ink">{presetKeyword(preset, locale)}</span>
                    <span className="shrink-0 text-[9px] font-bold text-sub">{preset.id}</span>
                  </span>
                  <span className="mt-1 block text-[10px] leading-snug text-sub">{locale === 'en' ? preset.en.expression : preset.expression}</span>
                  <span className="mt-1.5 block text-[10px] font-bold leading-snug text-cyber">“{presetDialogue(preset, locale)}”</span>
                </button>
              </li>
            );
          })}
        </ul>
        {results.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-3 py-8 text-center text-xs font-bold text-sub">
            {t('찾는 프리셋이 없어요. 다른 키워드로 검색해 보세요.', 'No preset matched. Try another keyword.')}
          </p>
        ) : null}
      </div>

      {/* 선택한 프리셋의 표정·포즈·이펙트·대사 */}
      {picked ? (
        <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 mt-3 rounded-2xl border-2 border-primary/40 bg-paper/95 p-3 shadow-pop backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wide text-coralink">{t('선택한 프리셋', 'Selected preset')} · #{picked.id}</p>
              <p className="mt-0.5 text-sm font-black">{presetKeyword(picked, locale)}</p>
            </div>
            <button type="button" onClick={() => setPickedId(null)} className="chip min-h-9 !px-2.5 text-[11px]">
              {t('선택 해제', 'Clear')}
            </button>
          </div>
          <dl className="mt-2 grid gap-1 text-[11px] leading-relaxed">
            <div className="flex gap-1.5">
              <dt className="w-12 shrink-0 font-black text-sub">{t('표정', 'Face')}</dt>
              <dd className="min-w-0 text-ink">{locale === 'en' ? picked.en.expression : picked.expression}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="w-12 shrink-0 font-black text-sub">{t('포즈', 'Pose')}</dt>
              <dd className="min-w-0 text-ink">{locale === 'en' ? picked.en.pose : picked.pose}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="w-12 shrink-0 font-black text-sub">{t('이펙트', 'Effect')}</dt>
              <dd className="min-w-0 text-ink">{locale === 'en' ? picked.en.effect : picked.effect}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="w-12 shrink-0 font-black text-sub">{t('대사', 'Line')}</dt>
              <dd className="min-w-0 font-bold text-cyber">“{presetDialogue(picked, locale)}”</dd>
            </div>
          </dl>
          <Link
            href={createHref}
            onClick={() => { rememberPresetPick(picked.id); rememberPackagePick(null); }}
            className="btn-primary mt-2 min-h-12 w-full !py-3 text-sm"
          >
            {t('이 프리셋으로 내 이모티콘 만들기', 'Make my stickers with this preset')} <span aria-hidden="true">→</span>
          </Link>
          <p className="mt-1 text-center text-[10px] leading-relaxed text-sub">
            {t('만들기 3단계에서 이 프리셋이 미리 선택되고, 컷 구성에서 바꿀 수 있어요.', 'The preset is preselected at step 3 and can be changed there.')}
          </p>
        </div>
      ) : null}
    </div>
  );
}
