import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { DEFAULT_PALETTE, DEFAULT_SIGNATURE, EMOTIONS, TONES, renderSticker } from '../src/lib/art/sticker';
import { buildRenderPrompt, letteringDirection } from '../src/lib/ai/gemini-render';
import { charAdvance, inkFor, layoutCaption } from '../src/lib/studio/caption';
import { fontCssFromBytes } from '../src/lib/svg-fonts';
import { drawLayer, normalizeLayer } from '../src/lib/studio/layers';
import type { Emotion, StickerSpec, Tone } from '../src/lib/types';

function spec(overrides: Partial<StickerSpec> = {}): StickerSpec {
  return {
    seed: 42, tone: '2d-cute', palette: DEFAULT_PALETTE, signature: DEFAULT_SIGNATURE,
    emotion: 'joy', intensity: 85, prop: 'none', background: 'transparent',
    line: 'LET’S GO!', linePosition: 'bottom', ...overrides,
  };
}

/** 번들 캘리그라피 폰트를 SVG 안에 심는 CSS (CI 에도 파일이 있으므로 그대로 읽는다) */
const calliCss = fontCssFromBytes('calli', new Uint8Array(readFileSync('public/fonts/EmotiHakCalli.woff2')));

for (const emotion of Object.keys(EMOTIONS) as Emotion[]) {
  for (const tone of Object.keys(TONES) as Tone[]) {
    const svg = renderSticker(spec({ emotion, tone }));
    assert.ok(svg.includes('data-caption-effect="calligraphy"'), `${emotion}/${tone} has a calligraphy caption`);
    assert.ok(!svg.includes('NaN') && !svg.includes('undefined'), `${emotion}/${tone} has valid geometry`);
  }
}

const lively = renderSticker(spec());
assert.ok(lively.includes('data-caption-effect="calligraphy"'));
// 네모 말풍선 박스는 기본값이 아니다 — 배경 사각형/pill 테두리 없이 글자만 남는다.
const capStart = lively.indexOf('data-caption-effect="calligraphy"');
const capGroup = lively.slice(capStart, lively.indexOf('</g>', capStart));
assert.ok(!capGroup.includes('<rect'), 'no caption box remains');
assert.ok((lively.match(/<text /g) ?? []).length >= 2, 'caption uses the calligraphy passes (outline + ink)');
assert.ok(lively.includes('LET’S') && lively.includes('GO!'), 'every word of the caption survives the line break');
assert.ok(lively.includes('paint-order="stroke fill"'), 'thick white outline is painted under the fill');
assert.ok(lively.includes('rotate='), 'glyphs carry a hand-written tilt');
assert.ok(lively.includes('url(#captionShadow)'), 'soft drop shadow');
assert.equal(renderSticker(spec({ emotion: 'joy' })).match(/data-caption-effect="calligraphy"/g)?.length, 1);

// 감정별 포인트 컬러 (기쁨=코랄, 분노=레드, 슬픔=블루 …)
assert.ok(lively.includes(inkFor('joy')), 'joy caption uses the warm coral ink');
assert.notEqual(inkFor('joy'), inkFor('angry'));
assert.notEqual(inkFor('sad'), inkFor('joy'));
assert.ok(renderSticker(spec({ emotion: 'sad' })).includes(inkFor('sad')));
assert.ok(renderSticker(spec({ emotion: 'tired' })).includes(inkFor('tired')));

// 2줄 + 짧은 마지막 줄 강조
const twoLine = layoutCaption('오늘도 야근 각', { size: 60, maxWidth: 320, face: 'calli' });
assert.ok(twoLine.lines.length >= 1);
const emphasised = layoutCaption('자리 비웠습니다', { size: 60, maxWidth: 300, face: 'calli' });
assert.equal(emphasised.lines.length, 2, 'long captions wrap to two lines');
assert.ok(emphasised.lines[1].size > emphasised.lines[0].size, 'short second line is emphasised');
assert.ok(emphasised.width <= 300, 'layout stays inside the band');

// 같은 계산을 쓰므로 SVG·캔버스가 같은 폭을 본다 (한글 = 0.805em, 공백은 더 좁다)
assert.ok(charAdvance('가', 100, 'calli') > charAdvance('a', 100, 'calli'));
assert.equal(Math.round(charAdvance('가', 100, 'calli')), 81);
assert.equal(Math.round(charAdvance('가', 100, 'hand')), 82);

const escaped = renderSticker(spec({ line: '<tag>&' }));
assert.ok(escaped.includes('&lt;tag&gt;&amp;') && !escaped.includes('<tag>'));
assert.ok(renderSticker(spec({ line: '가'.repeat(34) })).length > 0, 'long captions are constrained');

// 임베드 폰트(@font-face)는 SVG 안에 들어가 <img>·resvg 래스터화에서도 같은 서체로 그려진다
const embedded = renderSticker(spec({ line: '월요병' }), { fontCss: calliCss });
assert.ok(embedded.includes('@font-face') && embedded.includes('data:font/woff2;base64,'));
assert.ok(embedded.includes('EmotiHak Calli'));
assert.ok(!renderSticker(spec({ line: '월요병' })).includes('@font-face'), 'inline preview skips the embedded copy');

// 캔버스 렌더러도 같은 레이아웃·잉크를 쓴다 (가짜 2D 컨텍스트로 호출 경로 검증)
type Call = { op: string; args: unknown[]; fill?: string; font?: string };
const calls: Call[] = [];
const fake = {
  save() { calls.push({ op: 'save', args: [] }); },
  restore() { calls.push({ op: 'restore', args: [] }); },
  translate(...a: number[]) { calls.push({ op: 'translate', args: a }); },
  rotate(...a: number[]) { calls.push({ op: 'rotate', args: a }); },
  beginPath() { calls.push({ op: 'beginPath', args: [] }); },
  arc() { calls.push({ op: 'arc', args: [] }); },
  ellipse() { calls.push({ op: 'ellipse', args: [] }); },
  closePath() { calls.push({ op: 'closePath', args: [] }); },
  fill() { calls.push({ op: 'fill', args: [] }); },
  stroke() { calls.push({ op: 'stroke', args: [] }); },
  fillRect() { calls.push({ op: 'fillRect', args: [] }); },
  rect() { calls.push({ op: 'rect', args: [] }); },
  moveTo() { calls.push({ op: 'moveTo', args: [] }); },
  lineTo() { calls.push({ op: 'lineTo', args: [] }); },
  arcTo() { calls.push({ op: 'arcTo', args: [] }); },
  roundRect() { calls.push({ op: 'roundRect', args: [] }); },
  quadraticCurveTo() { calls.push({ op: 'quadraticCurveTo', args: [] }); },
  bezierCurveTo() { calls.push({ op: 'bezierCurveTo', args: [] }); },
  strokeText(text: string, x: number, y: number) { calls.push({ op: 'strokeText', args: [text, x, y] }); },
  fillText(text: string, x: number, y: number) {
    calls.push({ op: 'fillText', args: [text, x, y], fill: String((this as { fillStyle?: string }).fillStyle ?? '') });
  },
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  lineJoin: '',
  miterLimit: 0,
  shadowColor: '',
  shadowBlur: 0,
  shadowOffsetY: 0,
  textAlign: '',
  textBaseline: '',
  font: '',
  measureText(text: string) { return { width: [...text].length * 10 }; },
} as unknown as CanvasRenderingContext2D;

calls.length = 0;
drawLayer(fake, normalizeLayer({ text: '커피 수혈 중', style: 'calli', bubble: 'none', x: 0.5, y: 0.86, size: 0.14 }), 360, { emotion: 'tired' });
const strokes = calls.filter((c) => c.op === 'strokeText');
const fills = calls.filter((c) => c.op === 'fillText');
assert.ok(strokes.length >= 5 && fills.length >= 5, 'every glyph is stroked and filled (no box)');
assert.equal(strokes.length, fills.length * 3, 'shadow + clean white outline + ink bold before the fill');
assert.ok(fills.some((c) => (c.fill ?? '').toLowerCase() === inkFor('tired').toLowerCase()), 'canvas uses the tired ink');
assert.ok(!calls.some((c) => c.op === 'fillRect'), 'no bubble rectangle for bubble=none');

calls.length = 0;
drawLayer(fake, normalizeLayer({ text: '출근', style: 'calli', bubble: 'round', x: 0.5, y: 0.86, size: 0.14 }), 360, { emotion: 'joy' });
assert.ok(calls.some((c) => c.op === 'arcTo' || c.op === 'roundRect'), 'round bubble stays available as an option');

for (const item of [spec(), spec({ emotion: 'angry' }), spec({ tone: 'watercolor' }), spec({ tone: 'pixel-art', linePosition: 'top' })]) {
  const png = await sharp(Buffer.from(renderSticker(item))).resize(360, 360).png().toBuffer();
  const metadata = await sharp(png).metadata();
  assert.equal(metadata.width, 360);
  assert.equal(metadata.height, 360);
  assert.ok(png.length > 1000);
}

const joyfulPrompt = buildRenderPrompt({ photoBase64: 'cGhvdG8=', mimeType: 'image/jpeg', tone: '2d-cute', emotion: 'joy', line: '좋아!' });
const angryPrompt = buildRenderPrompt({ photoBase64: 'cGhvdG8=', mimeType: 'image/jpeg', tone: '2d-cute', emotion: 'angry', line: '좋아!' });
assert.ok(joyfulPrompt.includes(letteringDirection('joy')) && joyfulPrompt.includes('좋아!'));
assert.ok(angryPrompt.includes(letteringDirection('angry')) && letteringDirection('angry') !== letteringDirection('joy'));
console.log('Calligraphy caption: SVG/canvas layout, outline, shadow, emotion ink, embedded font and raster checks passed');
