'use client';

import clsx from 'clsx';
import { PACK_FORMATS, packFormatById, type PackFormatId } from '@/lib/pack-formats';
import { tr, type Locale } from '@/lib/i18n/locale';

// ─────────────────────────────────────────────────────────────
// 표현 형태(팩 테마) 5종 선택 — 업로드 1단계
//  · 감정만 고르던 흐름에 "어떤 형태의 팩인가"를 먼저 정하게 한다.
//  · 선택값은 시트 → 팩 → 컷 프롬프트까지 그대로 전달된다.
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

  const basic = {
    id: null as PackFormatId | null,
    emoji: '😊',
    label: t('기본 감정 팩', 'Classic emotions'),
    tagline: t('기쁨·슬픔·화남 등 표정 중심', 'Joy, sadness, anger and more'),
    badge: t('12·24컷', '12/24 cuts'),
  };

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label={t('표현 형태 선택', 'Choose a pack format')} className="grid gap-3 sm:grid-cols-2">
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

        {PACK_FORMATS.map((format) => {
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
                  {format.cuts.length}{t('컷 구성', ' cuts')}
                </span>
                {format.needsSecondPhoto ? (
                  <span className="rounded-full border border-coral/40 bg-coral/10 px-2 py-0.5 text-[10px] font-bold text-coralink">
                    {needsPetNote ? t('나+반려동물', 'Me + pet') : t('사진 2장', 'Two photos')}
                  </span>
                ) : null}
                <span className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] font-bold text-primary-dark">
                  {t('한글 레이어', 'Korean layer')}
                </span>
              </span>
            </button>
          );
        })}
      </div>

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
            '표정 중심 팩입니다. 실제 대화에서 쓰는 상황·행동, 뉴스 자막, 2인 케미, 글자 주인공, 이펙트 콤보 중에서 형태를 고르면 그에 맞는 컷과 프롬프트로 만들어 드려요.',
            'Classic expression pack. Choose a situation, caption, duo, typography or effect format to get cuts built for that format.',
          )}
        </p>
      )}
    </div>
  );
}
