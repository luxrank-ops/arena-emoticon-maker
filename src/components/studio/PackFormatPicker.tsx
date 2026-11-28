'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { PACK_FORMATS, packFormatById, type PackFormatId } from '@/lib/pack-formats';
import { tr, type Locale } from '@/lib/i18n/locale';

// ─────────────────────────────────────────────────────────────
// 팩 종류 선택 — 업로드 1단계
//  · 감정만 고르던 흐름에 "어떤 팩인가"를 먼저 정하게 한다.
//  · 선택값은 시트 → 팩 → 컷 프롬프트까지 그대로 전달된다.
//  · 처음 온 사람이 한 화면에서 고를 수 있게, 기본·킬러 3개만 먼저 보여 주고
//    나머지 형태는 '다른 팩 형태 더 보기'로 접어 둔다.
// ─────────────────────────────────────────────────────────────

export function PackFormatPicker({
  value,
  onChange,
  locale = 'ko',
  subjectKind = 'person',
}: {
  value: PackFormatId | null;
  onChange: (id: PackFormatId | null) => void;
  locale?: Locale;
  subjectKind?: 'person' | 'pet';
}) {
  const t = (ko: string, en: string) => tr(locale, ko, en);
  const selected = value ? packFormatById(value) : undefined;
  const [showAll, setShowAll] = useState(false);

  const basic = {
    id: null as PackFormatId | null,
    emoji: '😊',
    label: t('기본 감정 팩', 'Classic emotions'),
    tagline: t('기쁨·슬픔·화남 등 표정 12컷', 'Joy, sadness, anger — 12 cuts'),
    badge: t('표정 12컷', '12 expression cuts'),
  };

  const killerFormats = PACK_FORMATS.filter((format) => format.killer);
  const otherFormats = PACK_FORMATS.filter((format) => !format.killer);
  // 기본·킬러를 고른 상태면 접힌 목록도 열어 둔다(고른 값을 다시 찾을 수 있게).
  const expanded = showAll || (!!value && otherFormats.some((format) => format.id === value));

  /** 팩 카드 한 장 — 접힌 목록과 펼친 목록이 같은 모양을 쓴다. */
  const formatCard = (format: (typeof PACK_FORMATS)[number]) => {
    const active = value === format.id;
    const needsPetNote = format.id === 'duo' && subjectKind === 'pet';
    return (
      <button
        key={format.id}
        type="button"
        role="radio"
        aria-checked={active}
        onClick={() => onChange(format.id)}
        className={clsx(
          'card flex h-full flex-col items-start gap-1 p-4 text-left transition',
          active ? 'border-2 border-primary bg-primary/[0.04] ring-4 ring-primary/10' : 'hover:-translate-y-0.5 hover:shadow-pop',
        )}
      >
        <span className="text-2xl" aria-hidden="true">{format.emoji}</span>
        <span className="text-sm font-black">{locale === 'en' ? format.labelEn : format.label}</span>
        <span className="text-[11px] leading-snug text-sub">{locale === 'en' ? format.taglineEn : format.tagline}</span>
        <span className="mt-auto flex flex-wrap gap-1 pt-2">
          <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-bold text-sub">
            {format.cuts.length}{t('컷', ' cuts')}
          </span>
          {format.needsSecondPhoto ? (
            <span className="rounded-full border border-coral/40 bg-coral/10 px-2 py-0.5 text-[10px] font-bold text-coralink">
              {needsPetNote ? t('나+반려동물', 'Me + pet') : t('사진 2장', 'Two photos')}
            </span>
          ) : null}
          <span className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] font-bold text-primary-dark">
            {t('대사 자동', 'Auto captions')}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-3">
      {killerFormats.length ? (
        <section aria-labelledby="killer-themes" className="rounded-2xl border-2 border-coral/40 bg-coral/[0.04] p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 id="killer-themes" className="text-sm font-black">🔥 {t('킬러 테마 — 가장 많이 만드는 두 팩', 'Killer themes — the two most-made packs')}</h2>
            <span className="chip !border-coral/40 !bg-white !text-coralink">{t('12컷', '12 cuts')}</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-sub">
            {t('가장 많이 만드는 두 팩이에요. 4컷은 무료로 먼저 보고, 마음에 들면 12컷으로 완성해요.', 'The two most-made packs. See 4 cuts free, unlock to finish all 12.')}
          </p>
          <div role="radiogroup" aria-label={t('킬러 테마 선택', 'Choose a killer theme')} className="mt-3 grid gap-3 sm:grid-cols-2">
            {killerFormats.map((format) => {
              const active = value === format.id;
              return (
                <button
                  key={format.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChange(format.id)}
                  className={clsx(
                    'card flex h-full flex-col items-start gap-1 p-4 text-left transition',
                    active ? 'border-2 border-primary bg-primary/[0.04] ring-4 ring-primary/10' : 'hover:-translate-y-0.5 hover:shadow-pop',
                  )}
                >
                  <span className="text-2xl" aria-hidden="true">{format.emoji}</span>
                  <span className="text-sm font-black">{locale === 'en' ? format.labelEn : format.label}</span>
                  <span className="text-[11px] leading-snug text-sub">{locale === 'en' ? format.taglineEn : format.tagline}</span>
                  <span className="mt-auto flex flex-wrap gap-1 pt-2">
                    <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-bold text-sub">{format.cuts.length}{t('컷', ' cuts')}</span>
                    {format.unlockPrice ? (
                      <span className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] font-black text-primary-dark">
                        {t(`완성권 ${format.unlockPrice.toLocaleString('en-US')}원`, `Unlock ₩${format.unlockPrice.toLocaleString('en-US')}`)}
                      </span>
                    ) : null}
                    {format.needsSecondPhoto ? (
                      <span className="rounded-full border border-coral/40 bg-coral/10 px-2 py-0.5 text-[10px] font-bold text-coralink">{t('사진 2장', 'Two photos')}</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
      <div role="radiogroup" aria-label={t('팩 종류 선택', 'Choose a pack type')} className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          onClick={() => onChange(null)}
          className={clsx(
            'card flex h-full flex-col items-start gap-1 p-4 text-left transition',
            value === null ? 'border-2 border-primary bg-primary/[0.04] ring-4 ring-primary/10' : 'hover:-translate-y-0.5 hover:shadow-pop',
          )}
        >
          <span className="text-2xl" aria-hidden="true">{basic.emoji}</span>
          <span className="text-sm font-black">{basic.label}</span>
          <span className="text-[11px] leading-snug text-sub">{basic.tagline}</span>
          <span className="mt-auto pt-2 text-[10px] font-bold text-sub">{basic.badge}</span>
        </button>
        {otherFormats.slice(0, 1).map((format) => formatCard(format))}
        {expanded ? otherFormats.slice(1).map((format) => formatCard(format)) : null}
      </div>

      {!expanded && otherFormats.length > 1 ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line bg-white/70 px-4 py-3 text-[12px] font-black text-primary-dark transition hover:border-primary/40 hover:bg-primary/[0.04]"
        >
          {t(`다른 팩 형태 ${otherFormats.length - 1}개 더 보기`, `Show ${otherFormats.length - 1} more pack types`)}
          <span aria-hidden="true">↓</span>
        </button>
      ) : null}

      {selected ? (
        <div className="rounded-xl border border-line bg-cream px-4 py-3 text-[12px] leading-relaxed text-sub">
          <p className="font-bold text-ink">{locale === 'en' ? selected.descriptionEn : selected.description}</p>
          <p className="mt-1">
            {t(
              'AI는 글자 없이 그림을 만들고, 한글 대사·도장·이펙트는 앱이 레이어로 얹습니다. 문구·위치·글꼴은 만든 뒤에 바로 고칠 수 있어요.',
              'AI draws the picture without lettering; the app composes Korean text, stamps and effects as editable layers.',
            )}
          </p>
        </div>
      ) : (
        <p className="rounded-xl border border-line bg-cream px-4 py-3 text-[12px] leading-relaxed text-sub">
          {t(
            '가장 기본이 되는 표정 팩이에요. 고민되면 이대로 시작하세요.',
            'The classic expression pack — a safe default if you are unsure.',
          )}
        </p>
      )}
    </div>
  );
}
