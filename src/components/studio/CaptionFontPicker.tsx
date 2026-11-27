'use client';

import clsx from 'clsx';
import { TEXT_STYLES, type TextLayerStyle } from '@/lib/studio/layers';
import { tr, type Locale } from '@/lib/i18n/locale';

// ─────────────────────────────────────────────────────────────
// 글자체(대사 서체) 4종 선택 — 생성 화면·컷 편집·누끼 스튜디오가 함께 쓴다.
//  · 카드마다 그 서체로 직접 쓴 예시 글자를 보여 준다(번들 폰트 = 실제 결과와 같은 파일).
//  · 고르는 즉시 부모가 가진 레이어·팩 설정에 반영된다.
// ─────────────────────────────────────────────────────────────

export function CaptionFontPicker({
  value,
  onChange,
  locale = 'ko',
  columns = 2,
  disabled = false,
  label,
}: {
  value: TextLayerStyle;
  onChange: (style: TextLayerStyle) => void;
  locale?: Locale;
  columns?: 2 | 4;
  disabled?: boolean;
  label?: string;
}) {
  const t = (ko: string, en: string) => tr(locale, ko, en);
  return (
    <div>
      <p className="text-[10px] font-bold text-sub">{label ?? t('글자체', 'Font')}</p>
      <div
        role="radiogroup"
        aria-label={t('대사 글자체 선택', 'Caption font')}
        className={clsx('mt-1 grid gap-1.5', columns === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2')}
      >
        {TEXT_STYLES.map((style) => {
          const active = value === style.id;
          return (
            <button
              key={style.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(style.id)}
              title={locale === 'en' ? style.hintEn : style.hint}
              className={clsx(
                'rounded-xl border px-2 py-1.5 text-left transition disabled:opacity-40',
                active
                  ? 'border-primary bg-primary/[0.06] ring-2 ring-primary/20'
                  : 'border-line bg-white hover:border-primary/50',
              )}
            >
              <span
                className="block truncate text-[19px] leading-[1.25] text-ink"
                style={{ fontFamily: style.font, fontWeight: style.weight }}
                aria-hidden="true"
              >
                {style.sample}
              </span>
              <span className={clsx('mt-0.5 block truncate text-[10px] font-black', active ? 'text-primary-dark' : 'text-sub')}>
                {locale === 'en' ? style.labelEn : style.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
