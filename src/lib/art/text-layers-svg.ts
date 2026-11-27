// ─────────────────────────────────────────────────────────────
// 글자 레이어 → SVG (AI 컷 이미지 위에 얹는 레터링)
//  · 캔버스 내보내기(drawLayer)와 **같은 배치 계산**(planCaption)으로 그린다.
//  · 팩 목록·미리보기처럼 캔버스를 만들지 않는 화면에서도 같은 캘리그라피가 보인다.
//  · 글자 하나하나를 제 위치·기울기로 찍는다 — 캔버스가 글자마다 translate/rotate 하는 것과
//    똑같은 결과가 나온다(예전의 런(run) 단위 <text> 는 글자별 자간·기울기가 미리보기에서만
//    달라 보이는 원인이었다).
//  · 두툼한 화이트 스티커 테두리 + 세로 그라데이션 채움 + 얕은 그림자.
//  · 좌표계는 1024×1024 (StickerSpec 과 같은 viewBox).
// ─────────────────────────────────────────────────────────────

import type { Emotion } from '@/lib/types';
import { CAPTION_FACES, captionFaceSpec } from '@/lib/studio/caption';
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
      const spec = captionFaceSpec(plan.face);
      const face = CAPTION_FACES[plan.face];
      const family = escapeXml(spec.family);
      const left = -plan.width / 2;
      const top = -plan.height / 2;
      const sticker = (plan.outline * 1.15).toFixed(1);
      // 흰 외곽선을 칠할 때 글자 살을 살짝 더해 둔다(캔버스 strokeText 와 같은 두께).
      const outlineStroke = `${sticker}`;
      const boldStroke = plan.bold > 0 ? plan.bold.toFixed(1) : '0';

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

      // 글자 하나 = <text> 하나. 캔버스(drawGlyphs)와 같은 중심 좌표·회전을 쓴다.
      //  · 칠하는 순서도 캔버스와 같다: (1) 살 찌우기 → (2) 흰 스티커 외곽선 → (3) 그라데이션 채움.
      //    글자별로 1·2·3을 몰아 그리면 이웃 글자의 외곽선이 앞 글자 채움을 파고들어 자국이 남는다.
      const outlines: string[] = [];
      const bolds: string[] = [];
      const fills: string[] = [];
      for (const line of plan.lines) {
        const offset = (plan.width - line.width) / 2;
        for (const glyph of line.glyphs) {
          if (!glyph.ch.trim()) continue;
          const size = glyph.size ?? line.size;
          const cx = left + offset + glyph.x;
          const cy = top + line.baseline + glyph.dy;
          const text = escapeXml(glyph.ch);
          const common =
            `x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="middle" ` +
            `font-family="${family}" font-size="${size.toFixed(1)}" font-weight="${spec.weight}" ` +
            `stroke-linejoin="round"` +
            (glyph.angle ? ` transform="rotate(${glyph.angle.toFixed(2)} ${cx.toFixed(1)} ${cy.toFixed(1)})"` : '');
          if (plan.bold > 0) {
            bolds.push(`<text ${common} fill="${plan.ink}" stroke="${plan.ink}" stroke-width="${boldStroke}" paint-order="stroke fill">${text}</text>`);
          }
          outlines.push(
            `<text ${common} fill="${plan.ink}" stroke="#FFFDFA" stroke-width="${outlineStroke}" paint-order="stroke fill">${text}</text>`,
          );
          fills.push(`<text ${common} fill="url(#${id}-ink)" stroke="none">${text}</text>`);
        }
      }
      const glyphs = (bolds.length ? `<g data-caption-pass="weight">${bolds.join('')}</g>` : '') +
        `<g data-caption-pass="outline">${outlines.join('')}</g>` +
        `<g data-caption-pass="ink">${fills.join('')}</g>`;

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

      // 상황별 복합 데코 — 머리 위·볼 옆·글자 모서리에 캔버스 절대 좌표로 흩어 놓는다.
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
        stage: layerIndex === 0,
      });
      const decorGroup = decor.length ? `<g data-decor-layer="${id}">${renderDecorSvg(decor)}</g>` : '';

      return (
        decorGroup +
        `<g data-caption-effect="calligraphy" data-caption-face="${plan.face}" transform="translate(${plan.x.toFixed(1)} ${plan.y.toFixed(1)}) rotate(${plan.rotate.toFixed(2)})" ` +
        `filter="url(#captionShadow)">${glyphs}${underline}</g>`
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
export function renderTextLayersOverlay(layers: TextLayer[], emotion?: Emotion, idPrefix = 'cap'): string {
  const { defs, body } = renderTextLayersWithDefs(layers, emotion, idPrefix);
  if (!body) return '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" aria-hidden="true">` +
    `<defs><filter id="captionShadow" x="-35%" y="-35%" width="170%" height="170%">` +
    `<feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#191512" flood-opacity="0.24"/></filter>${defs}</defs>` +
    body +
    `</svg>`
  );
}
