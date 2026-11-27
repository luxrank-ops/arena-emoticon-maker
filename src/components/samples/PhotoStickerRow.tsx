import { Sticker } from '@/components/Sticker';
import { DEFAULT_PALETTE, DEFAULT_SIGNATURE } from '@/lib/art/sticker';
import { layerFromLine, type TextLayer, type TextLayerStyle } from '@/lib/studio/layers';
import { tr, type Locale } from '@/lib/i18n/locale';
import type { Emotion, StickerSpec } from '@/lib/types';

function specFor(src: string, emotion: Emotion, line: string, style?: TextLayerStyle): StickerSpec {
  // 컷 크기가 작은 자리에서도 대사가 밖으로 넘치지 않게 글자 수에 맞춰 줄인다(512 캔버스 기준).
  // 작은 타일에서도 대사가 또렷하게 읽히도록 조금 크게 — 길면 자동으로 줄어든다.
  const size = Math.min(0.19, 0.92 / Math.max(line.length, 1));
  const layer = layerFromLine(line, { size, y: 0.84, ...(style ? { style } : {}) });
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
 * 실사 사진 컷 한 줄 — 사진 누끼 결과(흰 외곽선 + 캘리그라피 한 줄)만 나란히 보여 준다.
 *  · PhotoSampleStrip(원본 → 결과)과 달리 원본 사진 없이 결과만 보여 주는 자리에 쓴다(/waitlist · /quotes).
 *  · 컷은 public/samples/photo · public/samples/quote-photo 의 실사 에셋을 재사용한다.
 */
export function PhotoStickerRow({
  cuts,
  locale,
  title,
  note,
  columns = 4,
  className,
}: {
  cuts: readonly { src: string; line: { ko: string; en: string }; emotion: Emotion; style?: TextLayerStyle }[];
  locale: Locale;
  title?: string;
  note?: string;
  columns?: 3 | 4;
  className?: string;
}) {
  const t = (ko: string, en: string) => tr(locale, ko, en);
  return (
    <div className={className}>
      {title ? (
        <p className="text-[10.5px] font-black uppercase tracking-[0.12em] text-sub/85">{title}</p>
      ) : null}
      <ul className={['mt-2 grid gap-1.5', columns === 4 ? 'grid-cols-4' : 'grid-cols-3'].join(' ')}>
        {cuts.map((cut) => (
          <li key={cut.src} className="min-w-0">
            <Sticker
              spec={specFor(cut.src, cut.emotion, tr(locale, cut.line.ko, cut.line.en), cut.style)}
              ariaLabel={t(`${cut.line.ko} 실사 스티커 예시`, `${cut.line.en} photo sticker sample`)}
            />
          </li>
        ))}
      </ul>
      {note ? <p className="mt-2 text-[10px] leading-relaxed text-sub/85">{note}</p> : null}
    </div>
  );
}
