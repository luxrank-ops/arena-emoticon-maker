// ─────────────────────────────────────────────────────────────
// 글자 레이어 → SVG (AI 컷 이미지 위에 얹는 레터링)
//  · 캔버스 내보내기(drawLayer)와 **같은 배치 계산**(planCaption)으로 그린다.
//  · 팩 목록·미리보기처럼 캔버스를 만들지 않는 화면에서도 같은 캘리그라피가 보인다.
//  · 두툼한 화이트 스티커 테두리 + 얇은 톤 링 + 세로 그라데이션 채움 + 붓 밑줄.
//  · 좌표계는 1024×1024 (StickerSpec 과 같은 viewBox).
// ─────────────────────────────────────────────────────────────

import type { Emotion } from '@/lib/types';
import { CAPTION_FONT_FAMILIES } from '@/lib/studio/caption';
import { planCaption } from '@/lib/studio/caption-plan';
import { planDecor, renderDecorSvg } from '@/lib/studio/decor';
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

interface SvgParts {
  defs: string;
  body: string;
}

/** 레이어 묶음을 <g> 로 그린다 (defs 에 그라데이션 정의가 함께 나온다) */
export function renderTextLayersWithDefs(layers: TextLayer[], emotion?: Emotion, idPrefix = 'cap'): SvgParts {
  const defs: string[] = [];
  const body = layers
    .map((layer, layerIndex) => {
      if (!layer.text.trim()) return '';
      const id = `${idPrefix}${layerIndex}`;
      const plan = planCaption(
        {
          text: layer.text,
          style: layer.style,
          color: layer.color,
          x: layer.x,
          y: layer.y,
          size: layer.size,
          rotate: layer.rotate,
        },
        SIZE,
        emotion,
      );
      const family = escapeXml(CAPTION_FONT_FAMILIES[plan.face]);
      const left = -plan.width / 2;
      const top = -plan.height / 2;
      const outline = plan.outline.toFixed(1);
      const thick = (plan.outline * 1.24).toFixed(1);
      const ringWidth = Math.max(1, plan.outline * 0.42).toFixed(1);

      defs.push(
        `<linearGradient id="${id}-ink" x1="0" y1="${top.toFixed(1)}" x2="0" y2="${(top + plan.height).toFixed(1)}" gradientUnits="userSpaceOnUse">` +
          `<stop offset="0" stop-color="${plan.inkLight}"/><stop offset="0.55" stop-color="${plan.ink}"/>` +
          `<stop offset="1" stop-color="${plan.ink}"/></linearGradient>`,
      );
      if (plan.underline) {
        const half = plan.underline.width / 2;
        defs.push(
          `<linearGradient id="${id}-brush" x1="${(-half).toFixed(1)}" y1="0" x2="${half.toFixed(1)}" y2="0" gradientUnits="userSpaceOnUse">` +
            `<stop offset="0" stop-color="${plan.underline.color}" stop-opacity="0"/>` +
            `<stop offset="0.18" stop-color="${plan.underline.color}" stop-opacity="0.55"/>` +
            `<stop offset="0.82" stop-color="${plan.underline.color}" stop-opacity="0.55"/>` +
            `<stop offset="1" stop-color="${plan.underline.color}" stop-opacity="0"/></linearGradient>`,
        );
      }

      const rows = plan.lines
        .map((line) => {
          const offset = (plan.width - line.width) / 2;
          const y = (top + line.baseline).toFixed(1);
          // 강조 단어처럼 글자 크기가 다른 구간은 런(run)으로 나눠 따로 그린다.
          const runs: { size: number; start: number; glyphs: typeof line.glyphs }[] = [];
          for (const glyph of line.glyphs) {
            const gSize = glyph.size ?? line.size;
            const last = runs[runs.length - 1];
            if (last && Math.abs(last.size - gSize) < 0.01) {
              last.glyphs.push(glyph);
            } else {
              runs.push({ size: gSize, start: left + offset + glyph.x - glyph.advance / 2, glyphs: [glyph] });
            }
          }
          return runs
            .map((run) => {
              const text = escapeXml(run.glyphs.map((glyph) => glyph.ch).join(''));
              if (!text.trim()) return '';
              const rotate = run.glyphs.map((glyph) => glyph.angle).join(' ');
              const common =
                `x="${run.start.toFixed(1)}" y="${y}" text-anchor="start" font-family="${family}" ` +
                `font-size="${run.size.toFixed(1)}" font-weight="400" rotate="${rotate}" stroke-linejoin="round"`;
              return (
                `<text ${common} fill="${plan.ink}" stroke="#FFFDFA" stroke-width="${thick}" paint-order="stroke fill">${text}</text>` +
                `<text ${common} fill="${plan.ink}" stroke="#FFFDFA" stroke-width="${outline}" paint-order="stroke fill">${text}</text>` +
                `<text ${common} fill="none" stroke="${plan.ring}" stroke-opacity="0.45" stroke-width="${ringWidth}">${text}</text>` +
                (plan.bold > 0.2
                  ? `<text ${common} fill="${plan.ink}" stroke="${plan.ink}" stroke-width="${plan.bold.toFixed(1)}" paint-order="stroke fill">${text}</text>`
                  : '') +
                `<text ${common} fill="url(#${id}-ink)" stroke="none">${text}</text>`
              );
            })
            .join('');
        })
        .join('');

      const underline = plan.underline
        ? (() => {
            const u = plan.underline!;
            const half = u.width / 2;
            return (
              `<path d="M ${(-half).toFixed(1)} ${u.y.toFixed(1)} Q 0 ${(u.y + u.curve).toFixed(1)} ${half.toFixed(1)} ${(u.y - u.curve * 0.6).toFixed(1)}" ` +
              `fill="none" stroke="url(#${id}-brush)" stroke-width="${u.thickness.toFixed(1)}" stroke-linecap="round"/>`
            );
          })()
        : '';

      // 상황별 복합 데코 — 글자와 같은 transform 으로, 글자 박스 바로 옆에 바짝 붙는다.
      //  · 데코는 자체 그림자(반투명 실루엣)를 쓰므로 글자 그룹의 drop-shadow 필터와 분리한다.
      const decor = planDecor({
        text: layer.text,
        emotion,
        effect: layer.effect,
        width: plan.width,
        height: plan.height,
        fontSize: plan.size,
        x: plan.x,
        y: plan.y,
        rotate: plan.rotate,
        canvas: SIZE,
        enabled: layer.decor !== 'off',
      });
      const decorGroup = decor.length
        ? `<g transform="translate(${plan.x.toFixed(1)} ${plan.y.toFixed(1)}) rotate(${plan.rotate.toFixed(2)})" data-decor-layer="${id}">${renderDecorSvg(decor)}</g>`
        : '';

      return (
        decorGroup +
        `<g data-caption-effect="calligraphy" transform="translate(${plan.x.toFixed(1)} ${plan.y.toFixed(1)}) rotate(${plan.rotate.toFixed(2)})" ` +
        `filter="url(#captionShadow)">${rows}${underline}</g>`
      );
    })
    .join('');
  return { defs: defs.join(''), body };
}

/** 레이어 묶음 본문만 (defs 는 호출하는 쪽 SVG 에 이미 있다고 가정) */
export function renderTextLayersSvg(layers: TextLayer[], emotion?: Emotion, idPrefix = 'cap'): string {
  return renderTextLayersWithDefs(layers, emotion, idPrefix).body;
}

/** 오버레이용 완성 SVG (이미지 위에 겹치는 레이어) */
export function renderTextLayersOverlay(layers: TextLayer[], emotion?: Emotion): string {
  const { defs, body } = renderTextLayersWithDefs(layers, emotion, 'cap');
  if (!body) return '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" aria-hidden="true">` +
    `<defs><filter id="captionShadow" x="-35%" y="-35%" width="170%" height="170%">` +
    `<feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#191512" flood-opacity="0.32"/></filter>${defs}</defs>` +
    body +
    `</svg>`
  );
}
