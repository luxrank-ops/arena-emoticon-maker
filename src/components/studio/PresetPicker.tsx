'use client';

// ─────────────────────────────────────────────────────────────
// 표정·포즈·이펙트·대사 프리셋 150종 선택기
//  · 카테고리 필터 + 키워드(한/영) 검색 + 랜덤/추천 채우기
//  · 고른 순서대로 컷이 만들어지고, 그 순서가 팩의 컷 순서가 된다.
//  · 선택값(id 배열)만 위로 올려보내고 저장·생성은 호출한 화면이 맡는다.
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  PRESET_CATEGORIES,
  presetById,
  presetCategoryLabel,
  presetDialogue,
  presetKeyword,
  randomPresetIds,
  recommendedPresetIds,
  searchPresets,
} from '@/data/emoticon-presets-150';
import { tr, type Locale } from '@/lib/i18n/locale';

export function PresetPicker({
  selectedIds,
  max,
  onChange,
  locale = 'ko',
  label,
  hint,
}: {
  selectedIds: number[];
  /** 컷 수(팩 크기) 또는 1(개별 컷 다시 그리기) */
  max: number;
  onChange: (ids: number[]) => void;
  locale?: Locale;
  /** 위쪽 제목 (기본: '표정·포즈 프리셋 150') */
  label?: string;
  /** 목록 위에 붙는 한 줄 설명 */
  hint?: string;
}) {
  const t = (ko: string, en: string) => tr(locale, ko, en);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const results = useMemo(() => searchPresets({ category, query }), [category, query]);
  const selected = useMemo(() => selectedIds.map((id) => presetById(id)).filter((preset): preset is NonNullable<typeof preset> => !!preset), [selectedIds]);
  const full = selectedIds.length >= max;
  const single = max === 1;

  function toggle(id: number) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
      return;
    }
    if (single) {
      onChange([id]);
      return;
    }
    if (full) return;
    onChange([...selectedIds, id]);
  }

  function fillRecommended() {
    if (single) {
      const [first] = recommendedPresetIds(1, []);
      if (first) onChange([first]);
      return;
    }
    onChange(recommendedPresetIds(max, []));
  }

  function fillRandom() {
    const room = Math.max(0, max - selectedIds.length);
    if (!room) return;
    onChange([...selectedIds, ...randomPresetIds(room, selectedIds)]);
  }

  return (
    <div className="rounded-xl border border-line bg-paper p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-black">{label ?? t('표정·포즈 프리셋 150', '150 expression presets')}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-sub">
            {hint ?? t('표정·포즈·이펙트·대사가 한 묶음이에요. 고른 순서대로 컷이 만들어집니다.', 'Each preset bundles an expression, a pose, effects and a caption. Cuts follow the order you pick.')}
          </p>
        </div>
        <span className={clsx('chip !bg-cream shrink-0', full && !single && '!border-primary/40 !text-primary-dark')}>
          {single ? t(`선택 ${selectedIds.length}/1`, `${selectedIds.length}/1 picked`) : t(`선택 ${selectedIds.length}/${max}`, `${selectedIds.length}/${max} picked`)}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <button type="button" className="chip min-h-9 !px-2.5 text-[11px] font-bold" onClick={fillRecommended}>
          {single ? t('추천 1개 고르기', 'Pick a suggestion') : t(`추천 ${max}개 채우기`, `Fill ${max} picks`)}
        </button>
        {!single ? (
          <button type="button" className="chip min-h-9 !px-2.5 text-[11px] font-bold" onClick={fillRandom} disabled={full}>
            🎲 {t('랜덤으로 채우기', 'Fill at random')}
          </button>
        ) : null}
        {selectedIds.length ? (
          <button type="button" className="chip min-h-9 !px-2.5 text-[11px] font-bold !text-coralink" onClick={() => onChange([])}>
            {t('선택 비우기', 'Clear')}
          </button>
        ) : null}
      </div>

      {selected.length ? (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={t('고른 프리셋', 'Selected presets')}>
          {selected.map((preset, index) => (
            <li key={preset.id}>
              <button
                type="button"
                onClick={() => toggle(preset.id)}
                title={t('눌러서 빼기', 'Tap to remove')}
                className="flex min-h-9 items-center gap-1 rounded-full border-2 border-primary bg-primary/10 px-2.5 text-[11px] font-bold text-primary-dark"
              >
                {!single ? <span className="grid h-4 w-4 place-items-center rounded-full bg-primary text-[9px] text-white">{index + 1}</span> : null}
                {presetKeyword(preset, locale)}
                <span aria-hidden="true" className="text-[13px] leading-none">×</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <label className="mt-3 block">
        <span className="sr-only">{t('프리셋 검색', 'Search presets')}</span>
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('키워드 검색 (예: 환호, 출근, 심쿵)', 'Search (e.g. cheer, commute, heart)')}
            className="min-h-11 w-full rounded-xl border border-line bg-white px-3 pr-10 text-sm font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
          {query ? (
            <button
              type="button"
              aria-label={t('검색어 지우기', 'Clear search')}
              onClick={() => setQuery('')}
              className="absolute right-0.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-lg text-sub hover:text-ink"
            >
              ×
            </button>
          ) : null}
        </div>
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

      <p className="mt-2 text-[11px] font-bold text-sub">
        {t(`${results.length}종 표시`, `${results.length} presets`)}
        {!single && full ? ` · ${t('가득 찼어요. 바꾸려면 하나를 빼세요.', 'Full. Remove one to swap.')}` : ''}
      </p>

      <div className="mt-1.5 max-h-[340px] overflow-y-auto overscroll-contain rounded-lg border border-line/70 bg-cream/40 p-1.5">
        {results.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs font-bold text-sub">
            {t('찾는 프리셋이 없어요. 다른 키워드로 검색해 보세요.', 'No preset matched. Try another keyword.')}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {results.map((preset) => {
              const index = selectedIds.indexOf(preset.id);
              const isSelected = index >= 0;
              return (
                <li key={preset.id}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    disabled={!isSelected && full && !single}
                    onClick={() => toggle(preset.id)}
                    className={clsx(
                      'h-full w-full rounded-xl border-2 p-2 text-left transition disabled:opacity-40',
                      isSelected ? 'border-primary bg-primary/10' : 'border-line bg-paper hover:border-primary/50',
                    )}
                  >
                    <span className="flex items-start justify-between gap-1">
                      <span className="text-[12px] font-black leading-tight text-ink">{presetKeyword(preset, locale)}</span>
                      {isSelected && !single ? (
                        <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary text-[9px] font-black text-white">{index + 1}</span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-[10px] leading-snug text-sub">{locale === 'en' ? preset.en.expression : preset.expression}</span>
                    <span className="mt-1 block text-[10px] font-bold leading-snug text-cyber">“{presetDialogue(preset, locale)}”</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
