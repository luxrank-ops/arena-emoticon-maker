import clsx from 'clsx';
import { renderSticker } from '@/lib/art/sticker';
import { renderTextLayersOverlay } from '@/lib/art/text-layers-svg';
import { normalizeLayers } from '@/lib/studio/layers';
import type { StickerSpec } from '@/lib/types';

/** StickerSpec → SVG. 서버/클라이언트 어디서든 동일하게 렌더된다. */
export function Sticker({
  spec,
  className,
  ariaLabel,
}: {
  spec: StickerSpec;
  className?: string;
  ariaLabel?: string;
}) {
  const layers = normalizeLayers(spec.textLayers);

  // AI가 만든 실제 컷 이미지가 있으면 그것을 보여준다 (기본 경로)
  if (spec.imageUrl) {
    // 글자 레이어는 이미지 위에 같은 캘리그라피로 얹는다(내보내기와 같은 배치 계산).
    const overlay = layers.length ? renderTextLayersOverlay(layers, spec.emotion) : '';
    return (
      <div className={clsx('relative block aspect-square w-full', className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={spec.imageUrl}
          alt={ariaLabel ?? '이모티콘 미리보기'}
          className="block h-full w-full object-contain"
          draggable={false}
        />
        {overlay ? (
          <div
            className="pointer-events-none absolute inset-0 [&>svg]:h-full [&>svg]:w-full"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: overlay }}
          />
        ) : null}
      </div>
    );
  }
  const svg = renderSticker(spec);
  return (
    <div
      className={clsx('sticker-svg', className)}
      role="img"
      aria-label={ariaLabel ?? '이모티콘 미리보기'}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
