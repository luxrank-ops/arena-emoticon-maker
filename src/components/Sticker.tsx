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
