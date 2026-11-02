import clsx from 'clsx';
import { renderSticker } from '@/lib/art/sticker';
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
  // AI가 만든 실제 컷 이미지가 있으면 그것을 보여준다 (기본 경로)
  if (spec.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={spec.imageUrl}
        alt={ariaLabel ?? '이모티콘 미리보기'}
        className={clsx('block aspect-square w-full object-contain', className)}
        draggable={false}
      />
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
