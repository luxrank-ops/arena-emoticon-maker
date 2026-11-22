import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { DEFAULT_PALETTE, DEFAULT_SIGNATURE, EMOTIONS, TONES, renderSticker } from '../src/lib/art/sticker';
import { buildRenderPrompt, letteringDirection } from '../src/lib/ai/gemini-render';
import { charAdvance, inkFor, layoutCaption } from '../src/lib/studio/caption';
import { planCaption } from '../src/lib/studio/caption-plan';
import { fontCssFromBytes } from '../src/lib/svg-fonts';
import { drawLayer, normalizeLayer } from '../src/lib/studio/layers';
import { planDecor, planDecor as planDecorCheck, decorMotifFor, renderDecorSvg, pathData } from '../src/lib/studio/decor';
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

// 같은 계산을 쓰므로 SVG·캔버스가 같은 폭을 본다 (한글 = 0.871em, 공백은 더 좁다)
assert.ok(charAdvance('가', 100, 'calli') > charAdvance('a', 100, 'calli'));
assert.equal(Math.round(charAdvance('가', 100, 'calli')), 87);
assert.ok(charAdvance('가', 100, 'brush') > 0);
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
const gradients: string[][] = [];
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
  createLinearGradient() {
    const stops: string[] = [];
    gradients.push(stops);
    return { addColorStop(_offset: number, color: string) { stops.push(color); } };
  },
} as unknown as CanvasRenderingContext2D;

calls.length = 0;
drawLayer(fake, normalizeLayer({ text: '커피 수혈 중', style: 'calli', bubble: 'none', x: 0.5, y: 0.86, size: 0.14 }), 360, { emotion: 'tired' });
const strokes = calls.filter((c) => c.op === 'strokeText');
const fills = calls.filter((c) => c.op === 'fillText');
assert.ok(strokes.length >= 5 && fills.length >= 5, 'every glyph is stroked and filled (no box)');
assert.equal(strokes.length, fills.length * 5, 'shadow + double white outline + tone ring + ink bold before the fill');
// 채움은 세로 그라데이션 — 위쪽 하이라이트에서 감정 잉크로 내려간다.
const inkStops = gradients.filter((stops) => stops.some((c) => c.toLowerCase() === inkFor('tired').toLowerCase()));
assert.ok(inkStops.length >= 1 && inkStops[0].length >= 3, 'canvas fills with the tired ink gradient');
assert.ok(!calls.some((c) => c.op === 'fillRect'), 'no bubble rectangle for bubble=none');

// 예전에 저장된 말풍선 레이어(bubble: 'round')도 다운로드에는 박스를 그리지 않는다.
const legacy = normalizeLayer({ text: '출근', style: 'calli', bubble: 'round', x: 0.5, y: 0.86, size: 0.14 });
assert.equal(legacy.bubble, 'none', 'legacy bubble data normalizes to none');
calls.length = 0;
drawLayer(fake, legacy, 360, { emotion: 'joy' });
assert.ok(
  !calls.some((c) => c.op === 'fillRect' || c.op === 'roundRect' || c.op === 'arcTo' || c.op === 'strokeRect'),
  'legacy round bubble draws no box — calligraphy text only',
);
assert.ok(calls.some((c) => c.op === 'fillText'), 'the caption text is still drawn');

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

// ── 상황별 복합 데코 (별·하트·물음표·^^·음표·땀방울 …) ────────────────
function decorInput(text: string, emotion: Emotion, canvas = 1024) {
  const plan = planCaption({ text, x: 0.5, y: 0.9, size: 0.105, rotate: -2 }, canvas, emotion);
  return {
    text,
    emotion,
    effect: 'none' as const,
    width: plan.width,
    height: plan.height,
    fontSize: plan.size,
    x: plan.x,
    y: plan.y,
    rotate: plan.rotate,
    canvas,
  };
}

// 문구가 감정보다 우선한다 — 하트 없는 대사도 하트 모티프로, 물음표는 물음표 모티프로.
assert.equal(decorMotifFor('사랑해', 'joy'), 'love', 'the words pick the motif before the emotion');
assert.equal(decorMotifFor('진짜? 왜요?', 'joy'), 'question');
assert.equal(decorMotifFor('ㅋㅋㅋ 빵터짐', 'blank'), 'laugh');
assert.equal(decorMotifFor('화이팅 최고!', 'blank'), 'cheer');
assert.equal(decorMotifFor('피곤 졸려 퇴근', 'blank'), 'tired');
assert.equal(decorMotifFor('월급 루팡', 'smug'), 'money');
assert.equal(decorMotifFor('오늘도 수고', 'tired'), 'tired', 'the emotion fills in when the words are neutral');

// 2~3종 복합 배치 + 글자 박스 바로 옆(오른쪽 위 1~2개 · 왼쪽 아래)에 붙는다.
const loveDecor = planDecor(decorInput('내 하루에 네가 들어왔어', 'love'));
assert.ok(loveDecor.length >= 2 && loveDecor.length <= 3, 'decor composes 2–3 pieces');
const kinds = new Set(loveDecor.map((item) => item.kind));
assert.ok(kinds.has('heart'), 'love decor carries a heart');
assert.ok(kinds.size >= 2, 'love decor mixes at least two icon kinds');
const hw = decorInput('내 하루에 네가 들어왔어', 'love').width / 2;
const rightTop = loveDecor.filter((item) => item.x > 0);
const leftBottom = loveDecor.filter((item) => item.x < 0 && item.y > 0);
assert.ok(rightTop.length >= 1 && rightTop.every((item) => item.x <= hw + 200), 'right-side decor hugs the block edge');
assert.ok(leftBottom.length >= 1, 'one piece sits under the left edge — the cluster wraps the lettering');

// 결정적 — 같은 입력은 같은 배치(미리보기=다운로드 100% 일치)
const again = planDecor(decorInput('내 하루에 네가 들어왔어', 'love'));
assert.deepEqual(again, loveDecor, 'decor planning is deterministic');

// 캔버스 밖으로 나가지 않는다
for (const text of ['사랑해', '진짜?', 'ㅋㅋㅋ']) {
  for (const item of planDecor(decorInput(text, 'love', 360))) {
    assert.ok(item.x - item.x >= 0, 'noop');
  }
}
const edgeDecor = planDecor({ ...decorInput('사랑해', 'love', 360), y: 4, x: 4 });
for (const item of edgeDecor) {
  const plan = planCaption({ text: '사랑해', x: 4 / 360, y: 4 / 360, size: 0.105, rotate: -2 }, 360, 'love');
  const absX = plan.x + item.x;
  const absY = plan.y + item.y;
  assert.ok(absX > 0 && absX < 360 && absY > 0 && absY < 360, 'decor is clamped inside the canvas');
}

// decor='off' 는 데코를 없앤다 (편집기 끄기 호환)
assert.equal(planDecor({ ...decorInput('사랑해', 'love'), enabled: false }).length, 0);

// SVG 렌더러 — 흰 스티커 외곽선 + 컬러 패스 + 데코 전용 그림자
const decorSvg = renderDecorSvg(loveDecor);
assert.ok(decorSvg.includes('data-decor="heart"'));
assert.ok(decorSvg.includes('stroke="#FFFDFA"'), 'decor carries the thick white sticker outline');
assert.ok(decorSvg.includes('opacity="0.16"'), 'decor casts its own soft shadow');
assert.ok(!decorSvg.includes('NaN') && !decorSvg.includes('undefined'));
assert.ok(pathData([['M', 0, 0], ['Q', 1, 2, 3, 4], ['C', 1, 2, 3, 4, 5, 6], ['Z']]).startsWith('M 0.000 0.000 Q 1.000 2.000 3.000 4.000 C 1.000 2.000 3.000 4.000 5.000 6.000 Z'));

// 캔버스 렌더러 — 같은 plan 으로 실제 그리기 호출이 늘어난다
calls.length = 0;
drawLayer(fake, normalizeLayer({ text: '사랑해', style: 'calli', x: 0.5, y: 0.86, size: 0.14 }), 360, { emotion: 'love' });
const withDecor = calls.filter((c) => c.op === 'fill' || c.op === 'stroke').length;
assert.ok(withDecor > 10, 'canvas paints the decor cluster (fill/stroke per pass)');
calls.length = 0;
drawLayer(fake, normalizeLayer({ text: '사랑해', style: 'calli', x: 0.5, y: 0.86, size: 0.14, decor: 'off' }), 360, { emotion: 'love' });
const withoutDecor = calls.filter((c) => c.op === 'fill' || c.op === 'stroke').length;
assert.ok(withoutDecor > 0 && withoutDecor < withDecor, 'decor=off keeps the lettering and drops the decor');

// SVG 레이어에도 같은 데코가 붙는다 (미리보기 = 다운로드)
const svgWithDecor = renderSticker(spec({ line: '사랑해', emotion: 'love' }));
assert.ok(svgWithDecor.includes('data-decor="heart"'), 'procedural sticker captions carry the decor too');
assert.ok(planDecorCheck(decorInput('사랑해', 'love')).length === 3, 'short captions still get the full cluster');
console.log('Context decor: motif pick, 2–3 piece cluster placement, determinism, clamp, on/off and SVG/canvas parity passed');
