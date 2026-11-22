'use client';

import { Sticker } from '@/components/Sticker';
import { DEFAULT_PALETTE, DEFAULT_SIGNATURE } from '@/lib/art/sticker';
import { SAMPLE_CUTS } from '@/lib/quote-samples';
import { layerFromLine } from '@/lib/studio/layers';
import type { Emotion, StickerSpec } from '@/lib/types';
import { tr, type Locale } from '@/lib/i18n/locale';

function sampleSpec(emotion: Emotion, line: string, seed: number): StickerSpec {
  const layer = layerFromLine(line);
  return {
    seed,
    tone: '2d-cute',
    palette: DEFAULT_PALETTE,
    signature: DEFAULT_SIGNATURE,
    emotion,
    intensity: 74,
    prop: 'none',
    background: 'transparent',
    line,
    linePosition: 'bottom',
    imageUrl: SAMPLE_CUTS[emotion],
    ...(layer ? { textLayers: [layer] } : {}),
  };
}

/**
 * 사진을 고르기 전에 보여 주는 원본 → 이모티콘 예시.
 * 실제 사진으로 만든 샘플 컷을 쓰고, 대사는 앱의 캘리그라피 레이어가 얹는다.
 */
export function SampleFlowStrip({ locale }: { locale: Locale }) {
  const t = (ko: string, en: string) => tr(locale, ko, en);
  const cuts: { emotion: Emotion; line: string }[] = [
    { emotion: 'joy', line: t('고마워!', 'Thank you!') },
    { emotion: 'surprised', line: t('헉, 진짜?', 'Wait, really?') },
    { emotion: 'tired', line: t('오늘은 여기까지', 'Calling it a day') },
  ];
  return (
    <div className="mt-6 w-full rounded-2xl border border-line bg-cream/70 p-3">
      <p className="text-[11px] font-bold text-sub">{t('예시 · 사진 한 장이면 이렇게 만들어져요', 'Example · one photo is all it takes')}</p>
      <div className="mt-2 flex items-center justify-center gap-2">
        <figure className="w-[74px] shrink-0 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/samples/original-portrait.webp"
            alt={t('예시 원본 사진', 'Sample original photo')}
            width={512}
            height={512}
            className="aspect-square w-full rounded-xl border border-line bg-white object-cover"
          />
          <figcaption className="mt-1 text-[10px] font-black text-sub">{t('원본', 'Photo')}</figcaption>
        </figure>
        <span aria-hidden="true" className="text-base font-black text-coralink">→</span>
        {cuts.map((cut, index) => (
          <figure key={cut.emotion} className="w-[74px] text-center">
            <Sticker spec={sampleSpec(cut.emotion, cut.line, 1061 + index * 37)} ariaLabel={t(`${cut.line} 예시 이모티콘`, `${cut.line} sample sticker`)} />
            <figcaption className="truncate text-[10px] font-black text-sub">{cut.line}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
