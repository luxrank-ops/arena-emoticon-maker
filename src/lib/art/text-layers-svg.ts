// ─────────────────────────────────────────────────────────────
// 글자 레이어 → SVG (AI 컷 이미지 위에 얹는 레터링)
//  · 캔버스 내보내기(drawLayer)와 **같은 배치 계산**(planCaption)으로 그린다.
//  · 팩 목록·미리보기처럼 캔버스를 만들지 않는 화면에서도 같은 캘리그라피가 보인다.
//  · 좌표계는 1024×1024 (StickerSpec 과 같은 viewBox).
// ─────────────────────────────────────────────────────────────

import type { Emotion } from '@/lib/types';
import { CAPTION_FONT_FAMILIES } from '@/lib/studio/caption';
import { planCaption } from '@/lib/studio/caption-plan';
import type { TextLayer } from '@/lib/studio/layers';

const SIZE = 1024;

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** 레이어 묶음을 <g> 로 그린다 (부모 SVG 의 defs 에 captionShadow 필터가 있어야 한다) */
export function renderTextLayersSvg(layers: TextLayer[], emotion?: Emotion): string {
  return layers
    .map((layer) => {
      if (!layer.text.trim()) return '';
      const plan = planCaption(
        {
          text: layer.text,
          style: layer.style,
          color: layer.color,
          x: layer.x,
          y: layer.y,
          size: layer.size,
          rotate: layer.rotate,
          bubble: layer.bubble,
        },
        SIZE,
        emotion,
      );
      const family = escapeXml(CAPTION_FONT_FAMILIES[plan.face]);
      const left = -plan.width / 2;
      const top = -plan.height / 2;
      const rows = plan.lines
        .map((line) => {
          const offset = (plan.width - line.width) / 2;
          const text = escapeXml(line.glyphs.map((glyph) => glyph.ch).join(''));
          const rotate = line.glyphs.map((glyph) => glyph.angle).join(' ');
          const y = (top + line.baseline).toFixed(1);
          const common =
            `x="${(left + offset).toFixed(1)}" y="${y}" text-anchor="start" font-family="${family}" ` +
            `font-size="${line.size.toFixed(1)}" font-weight="400" rotate="${rotate}" stroke-linejoin="round"`;
          return (
            `<text ${common} fill="${plan.ink}" stroke="#FFFDFA" stroke-width="${plan.outline.toFixed(1)}" paint-order="stroke fill">${text}</text>` +
            (plan.bold > 0
              ? `<text ${common} fill="${plan.ink}" stroke="${plan.ink}" stroke-width="${plan.bold.toFixed(1)}" paint-order="stroke fill">${text}</text>`
              : '')
          );
        })
        .join('');
      return (
        `<g data-caption-effect="calligraphy" transform="translate(${plan.x.toFixed(1)} ${plan.y.toFixed(1)}) rotate(${plan.rotate.toFixed(2)})" ` +
        `filter="url(#captionShadow)">${rows}</g>`
      );
    })
    .join('');
}

/** 오버레이용 완성 SVG (이미지 위에 겹치는 레이어) */
export function renderTextLayersOverlay(layers: TextLayer[], emotion?: Emotion): string {
  const body = renderTextLayersSvg(layers, emotion);
  if (!body) return '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" aria-hidden="true">` +
    `<defs><filter id="captionShadow" x="-25%" y="-25%" width="150%" height="150%">` +
    `<feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#191512" flood-opacity="0.28"/></filter></defs>` +
    body +
    `</svg>`
  );
}
