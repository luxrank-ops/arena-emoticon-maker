import { Sticker } from '@/components/Sticker';
import { DEFAULT_PALETTE, DEFAULT_SIGNATURE } from '@/lib/art/sticker';
import { layerFromLine, type TextLayer, type TextLayerStyle } from '@/lib/studio/layers';
import { tr, type Locale } from '@/lib/i18n/locale';
import type { PhotoSampleGroup } from '@/lib/photo-samples';
import type { Emotion, StickerSpec } from '@/lib/types';

function specFor(src: string, emotion: Emotion, line: string, style?: TextLayerStyle): StickerSpec {
  // 작은 타일에서도 대사가 스티커 밖으로 넘치지 않게 글자 수에 맞춰 크기를 줄인다(512 캔버스 기준).
  // 작은 타일에서도 대사가 또렷하게 읽히도록 조금 크게 — 길면 자동으로 줄어든다.
  const size = Math.min(0.19, 0.92 / Math.max(line.length, 1));
  const layer = layerFromLine(line, { size, y: 0.86, ...(style ? { style } : {}) });
  const textLayers: TextLayer[] = layer ? [layer] : [];
  return {
    seed: 1061,
    tone: 'photo-sticker',
    palette: DEFAULT_PALETTE,
    signature: DEFAULT_SIGNATURE,
    emotion,
    intensity: 74,
    prop: 'none',
    background: 'transparent',
    line,
    linePosition: 'bottom',
    imageUrl: src,
    textLayers,
  };
}

/**
 * '원본 사진 → 실사 스티커' 예시 스트립.
 *  · 앱이 실제로 만드는 결과(사진 누끼 + 흰 외곽선 + 캘리그라피 한 줄)를 그대로 보여 준다.
 *  · /pets · /couple · /team · /waitlist 같은 소개 화면에서 2D 일러스트 대신 쓰는 대표 비주얼.
 */
export function PhotoSampleStrip({
  group,
  locale,
  title,
  note,
  className,
}: {
  group: PhotoSampleGroup;
  locale: Locale;
  title?: string;
  note?: string;
  className?: string;
}) {
  const t = (ko: string, en: string) => tr(locale, ko, en);
  return (
    <div className={['rounded-[1.35rem] border border-line/80 bg-white/95 p-3 text-left shadow-card sm:p-4', className].filter(Boolean).join(' ')}>
      <p className="text-[10.5px] font-black uppercase tracking-[0.12em] text-sub/85">
        {title ?? t('예시 · 사진 한 장이면 이렇게', 'Example · one photo is all it takes')}
      </p>
      <div className="mt-2.5 flex items-center justify-center gap-1 sm:gap-2">
        <figure className="w-[54px] shrink-0 text-center sm:w-[74px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={group.source.src}
            alt={tr(locale, group.source.alt.ko, group.source.alt.en)}
            width={512}
            height={512}
            loading="lazy"
            className="aspect-square w-full rounded-xl border border-line bg-white object-cover"
          />
          <figcaption className="mt-1 text-[9.5px] font-black text-sub">{t('원본', 'Photo')}</figcaption>
        </figure>
        <span aria-hidden="true" className="text-sm font-black text-coralink sm:text-base">→</span>
        {group.cuts.map((cut) => (
          <figure key={cut.src} className="min-w-0 flex-1 text-center">
            <Sticker
              spec={specFor(cut.src, cut.emotion, tr(locale, cut.line.ko, cut.line.en), cut.style)}
              ariaLabel={tr(locale, cut.alt.ko, cut.alt.en)}
            />
          </figure>
        ))}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-sub/85">
        {note ?? t('사진 그대로 누끼 따고 대사만 얹은 실사 스티커예요. 예시 이미지입니다.', 'A real-photo sticker: cut out from the photo, one line added. Sample image.')}
      </p>
    </div>
  );
}
