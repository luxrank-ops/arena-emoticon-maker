import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { DEFAULT_PALETTE, DEFAULT_SIGNATURE, EMOTIONS, TONES, renderSticker } from '../src/lib/art/sticker';
import { buildRenderPrompt, letteringDirection } from '../src/lib/ai/gemini-render';
import { charAdvance, inkFor, layoutCaption } from '../src/lib/studio/caption';
import { planCaption } from '../src/lib/studio/caption-plan';
import { fontCssFromBytes } from '../src/lib/svg-fonts';
import { drawLayer, normalizeLayer } from '../src/lib/studio/layers';
import { renderTextLayersSvg } from '../src/lib/art/text-layers-svg';
import {
  planDecor,
  planDecor as planDecorCheck,
  decorMotifFor,
  decorKindsOf,
  decorSlotsOf,
  renderDecorSvg,
  pathData,
  decorInkArea,
  decorCoverage,
  decorVariantFor,
  decorVariantsOf,
  decorVariantSlotsOf,
  DECOR_KINDS,
  type DecorMotif,
  type DecorKind,
} from '../src/lib/studio/decor';
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
type Call = { op: string; args: unknown[]; fill?: string; stroke?: string; font?: string };
const calls: Call[] = [];
const gradients: string[][] = [];
const fake = {
  save() { calls.push({ op: 'save', args: [] }); },
  restore() { calls.push({ op: 'restore', args: [] }); },
  translate(...a: number[]) { calls.push({ op: 'translate', args: a }); },
  rotate(...a: number[]) { calls.push({ op: 'rotate', args: a }); },
  beginPath() { calls.push({ op: 'beginPath', args: [] }); },
  arc(...a: number[]) { calls.push({ op: 'arc', args: a }); },
  ellipse() { calls.push({ op: 'ellipse', args: [] }); },
  closePath() { calls.push({ op: 'closePath', args: [] }); },
  fill() { calls.push({ op: 'fill', args: [] }); },
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
  stroke() { calls.push({ op: 'stroke', args: [], stroke: String((this as { strokeStyle?: string }).strokeStyle ?? '') }); },
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

// 도장(stamp) 스타일 — 다운로드에도 글자만 찍는다. 예전에 글자 둘레에 그리던 빨간 이중 원(#C9342B)은 없다.
for (const style of ['stamp'] as const) {
  calls.length = 0;
  drawLayer(fake, normalizeLayer({ text: '생존 신고합니다', style, bubble: 'none', effect: 'none', decor: 'off', x: 0.5, y: 0.5, size: 0.2, rotate: -8 }), 360, { emotion: 'smug' });
  assert.ok(!calls.some((c) => c.op === 'arc'), `${style}: no circle/arc is drawn`);
  assert.ok(
    !calls.some((c) => c.op === 'stroke' && (c.stroke ?? '').toUpperCase() === '#C9342B'),
    `${style}: no red (#C9342B) stroke ring`,
  );
  assert.ok(calls.some((c) => c.op === 'fillText'), `${style}: the caption text is still drawn`);
  const stampSvg = renderTextLayersSvg([normalizeLayer({ text: '생존 신고합니다', style, bubble: 'none', effect: 'none', decor: 'off', x: 0.5, y: 0.5, size: 0.2, rotate: -8 })], 'smug');
  assert.ok(!/<circle/i.test(stampSvg), `${style}: the SVG preview draws no circle either`);
}

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

// 4~5종 복합 배치 — 주 데코는 머리 위, 나머지는 볼·관자·글자 모서리에 흩어진다.
const loveInput = decorInput('내 하루에 네가 들어왔어', 'love');
const loveDecor = planDecor(loveInput);
assert.ok(loveDecor.length >= 4 && loveDecor.length <= 5, 'decor composes 4–5 pieces');
const kinds = new Set(loveDecor.map((item) => item.kind));
assert.ok(kinds.has('heart'), 'love decor carries a heart');
assert.ok(kinds.size >= 2, 'love decor mixes at least two icon kinds');

// 주 데코 = 가장 큰 한 점. 머리 위(y 6~22% 구간)에 있고 글자 높이에 버금간다.
const hero = loveDecor.reduce((a, b) => (b.r > a.r ? b : a));
assert.ok(hero.y < loveInput.canvas * 0.22, 'the hero decor sits above the head');
assert.ok(hero.y > loveInput.canvas * 0.03, 'the hero is not cut off at the top edge');
assert.ok(Math.abs(hero.x - loveInput.canvas / 2) < loveInput.canvas * 0.16, 'the hero is over the head, not in a corner');
assert.ok(hero.r * 2 >= loveInput.fontSize * 0.75, 'the hero stays about letter height');
assert.ok(loveDecor.every((item) => item === hero || hero.r >= item.r * 1.3), 'the hero stands out from the accents');

// 위치 다양성 — 머리 위 · 옆(관자/볼) · 글자 모서리 세 구역이 모두 쓰인다.
const zone = (slot: string) => (slot.startsWith('text') ? 'text' : slot.startsWith('crown') ? 'crown' : 'side');
assert.equal(new Set(loveDecor.map((item) => zone(item.slot))).size, 3, 'decor spreads over the head, the sides and the lettering');

// 모든 모티프가 머리 위·옆·글자 모서리를 함께 쓴다 (데코가 한 곳에 몰리지 않는다).
for (const motif of ['love', 'question', 'laugh', 'cheer', 'tired', 'angry', 'sad', 'surprised', 'money', 'smug', 'plain'] as DecorMotif[]) {
  assert.ok(decorKindsOf(motif).length >= 2, `${motif}: mixes icon kinds`);
  assert.equal(new Set(decorSlotsOf(motif).map(zone)).size, 3, `${motif}: head + side + lettering`);
}

// 얼굴(눈·코·입) 한가운데는 절대 가리지 않는다.
const FACE = { x0: 0.33, x1: 0.67, y0: 0.275, y1: 0.63 };
for (const text of ['사랑해', '진짜? 왜요?', '오늘도 수고했어', 'ㅋㅋㅋ 빵터짐']) {
  for (const emotion of ['love', 'surprised', 'joy', 'angry'] as Emotion[]) {
    const input = decorInput(text, emotion);
    for (const item of planDecor(input)) {
      const reach = item.r * 1.12;
      const hitsFace =
        item.x + reach > FACE.x0 * input.canvas &&
        item.x - reach < FACE.x1 * input.canvas &&
        item.y + reach > FACE.y0 * input.canvas &&
        item.y - reach < FACE.y1 * input.canvas;
      assert.ok(!hitsFace, `${text}/${emotion}: ${item.kind} stays off the face`);
    }
  }
}

// 데코 분량 — 사용자 요청대로 문장 블록(가로×세로)의 약 20%. 짧은 문장은 20%에 맞고,
// 긴 문장은 글자 크기 기준으로 더 커지지 않으므로 분량비는 조금 낮아진다(과하지 않게).
const blockShare = (text: string, emotion: Emotion) => {
  const input = decorInput(text, emotion);
  const decor = planDecor(input);
  return decorInkArea(decor) / (input.width * input.height);
};
for (const [text, emotion] of [['사랑해', 'love'], ['최고!', 'joy'], ['좋아', 'love'], ['ㅇㅋ', 'smug']] as const) {
  const share = blockShare(text, emotion as Emotion);
  assert.ok(share > 0.14 && share < 0.26, `${text}: decor stays near a fifth of the caption (${share.toFixed(3)})`);
}
for (const [text, emotion] of [['내 하루에 네가 들어왔어', 'love'], ['오늘도 수고했어', 'tired'], ['귀찮아 아무것도 하기 싫어', 'sulk']] as const) {
  const share = blockShare(text, emotion as Emotion);
  assert.ok(share > 0.03 && share < 0.2, `${text}: long captions keep the decor light (${share.toFixed(3)})`);
}
assert.ok(
  blockShare('사랑해', 'love') > blockShare('내 하루에 네가 들어왔어', 'love'),
  'the shorter the caption, the heavier the decor reads',
);
// 예전(30~40%)보다 확실히 작아졌다 — 주 데코 지름이 글자 높이 언저리다.
assert.ok(blockShare('내 하루에 네가 들어왔어', 'love') < 0.2, 'decor no longer fills the frame');

// 데코는 캔버스 세로·가로로 넓게 흩어진다 (머리 위 → 볼 옆 → 글자 모서리)
const spread = planDecor(decorInput('내 하루에 네가 들어왔어', 'love'));
const xs = spread.map((item) => item.x);
const ys = spread.map((item) => item.y);
assert.ok(Math.max(...ys) - Math.min(...ys) > 1024 * 0.55, 'decor runs from the head down to the lettering');
assert.ok(Math.max(...xs) - Math.min(...xs) > 1024 * 0.55, 'decor reaches both sides of the frame');

// 주 데코는 글자 높이 언저리 — 글자를 압도하지 않는다 (0.6~1.3배).
for (const [text, emotion] of [
  ['사랑해', 'love'],
  ['내 하루에 네가 들어왔어', 'love'],
  ['ㅋㅋㅋ 빵터짐', 'laugh'],
  ['최고!', 'joy'],
  ['화나서 못 참겠어', 'angry'],
] as const) {
  const input = decorInput(text, emotion as Emotion);
  const heroR = Math.max(...planDecor(input).map((item) => item.r));
  assert.ok(heroR * 2 > input.fontSize * 0.6 && heroR * 2 < input.fontSize * 1.3, `${text}: hero is letter-height scale`);
}

// 결정적 — 같은 입력은 같은 배치(미리보기=다운로드 100% 일치)
const again = planDecor(decorInput('내 하루에 네가 들어왔어', 'love'));
assert.deepEqual(again, loveDecor, 'decor planning is deterministic');

// 캔버스 밖으로 나가지 않는다 (작은 캔버스·모서리로 몰린 글자도)
for (const canvas of [360, 1024]) {
  for (const text of ['사랑해', '진짜?', 'ㅋㅋㅋ']) {
    const input = decorInput(text, 'love', canvas);
    for (const item of planDecor(input)) {
      assert.ok(item.x - item.r * 1.22 > 0 && item.x + item.r * 1.22 < canvas, `${text}@${canvas}: inside horizontally`);
      assert.ok(item.y - item.r * 1.12 > 0 && item.y + item.r * 1.12 < canvas, `${text}@${canvas}: inside vertically`);
    }
  }
}
const edgeDecor = planDecor({ ...decorInput('사랑해', 'love', 360), y: 4, x: 4 });
for (const item of edgeDecor) {
  assert.ok(item.x > 0 && item.x < 360 && item.y > 0 && item.y < 360, 'decor is clamped inside the canvas');
}

// decor='off' 는 데코를 없앤다 (편집기 끄기 호환)
assert.equal(planDecor({ ...decorInput('사랑해', 'love'), enabled: false }).length, 0);

// 레이어가 여러 장이면 첫 레이어만 장면(머리 위) 데코를 맡는다 — 나머지는 글자 모서리에만.
assert.ok(planDecor({ ...decorInput('사랑해', 'love'), stage: true }).some((item) => zone(item.slot) !== 'text'), 'stage layer owns the head');
assert.ok(planDecor({ ...decorInput('사랑해', 'love'), stage: false }).every((item) => zone(item.slot) === 'text'), 'later layers keep the decor on the lettering');

// 문양(아이콘) 선택지 — 30종 이상, 모티프마다 2가지 이상 변주.
assert.ok(DECOR_KINDS.length >= 30, `icon catalogue is rich (${DECOR_KINDS.length})`);
const ALL_MOTIFS: DecorMotif[] = [
  'love', 'thanks', 'greet', 'question', 'laugh', 'cheer', 'congrats', 'praise',
  'tired', 'sleep', 'angry', 'complain', 'sad', 'cry', 'surprised', 'money', 'smug', 'plain',
];
assert.equal(ALL_MOTIFS.length, 18, 'eighteen situation motifs');
for (const motif of ALL_MOTIFS) {
  assert.ok(decorVariantsOf(motif) >= 2, `${motif}: has phrase-driven variants`);
}
// 모든 변주가 머리 위·옆·글자 주변 세 구역을 함께 쓴다 (한 곳에 몰리지 않는다).
for (const motif of ALL_MOTIFS) {
  for (let i = 0; i < decorVariantsOf(motif); i += 1) {
    const zones = new Set(decorVariantSlotsOf(motif, i).map(zone));
    assert.equal(zones.size, 3, `${motif}#${i}: head + side + lettering`);
  }
}

const distinctKinds = new Set(ALL_MOTIFS.flatMap((motif) => decorKindsOf(motif)));
assert.ok(distinctKinds.size >= 28, `motifs draw on ${distinctKinds.size} different icons`);

// 같은 감정·테마라도 문구가 다르면 다른 문양 조합이 나온다.
const combos = new Set<string>();
for (const [text, emotion] of [
  ['사랑해', 'love'],
  ['보고 싶어', 'love'],
  ['설레는 밤', 'love'],
  ['고마워', 'joy'],
  ['생일 축하해', 'joy'],
  ['최고야', 'joy'],
  ['졸려 죽겠어', 'tired'],
  ['야근 지겨워', 'tired'],
] as const) {
  const decor = planDecor(decorInput(text, emotion as Emotion));
  combos.add(decor.map((item) => item.kind).join('+'));
  const motifs = new Set(decor.map((item) => item.motif));
  assert.equal(motifs.size, 1, `${text}: one motif per caption`);
}
assert.ok(combos.size >= 6, `different phrases get different icon sets (${combos.size}/8)`);
// 하트 계열·별 계열 등 새 아이콘이 실제로 그려진다.
assert.ok(decorKindsOf('love').includes('heartBroken') && decorKindsOf('love').includes('heartSparkle'));
assert.ok(decorKindsOf('congrats').includes('crown') && decorKindsOf('sleep').includes('zzz'));
assert.ok(decorKindsOf('tired').includes('swirl') && decorKindsOf('laugh').includes('haha'));
assert.ok((DECOR_KINDS as DecorKind[]).includes('coinRain') && (DECOR_KINDS as DecorKind[]).includes('flower'));

// 편집기에서 직접 고를 수 있는 이펙트(문양) — 기본 6종 + 문양 확대 6종이 각각 다른 모티프로 이어진다.
import { LAYER_EFFECTS } from '../src/lib/studio/layers';
assert.equal(LAYER_EFFECTS.length, 13, 'thirteen selectable effects');
const effectMotifs = new Set<DecorMotif>();
for (const effect of LAYER_EFFECTS) {
  if (effect.id === 'none') continue;
  const motif = decorMotifFor('오늘 하루', undefined, effect.id);
  assert.ok(motif && motif !== 'plain', `${effect.id}: picks a situation motif`);
  effectMotifs.add(motif);
  const decor = planDecor({ ...decorInput('오늘 하루', 'joy'), effect: effect.id });
  assert.ok(decor.every((item) => item.motif === motif), `${effect.id}: every piece follows the chosen effect`);
  assert.equal(new Set(decor.map((item) => zone(item.slot))).size, 3, `${effect.id}: head + side + lettering`);
}
assert.ok(effectMotifs.size >= 8, `effects span ${effectMotifs.size} motifs`);

// SVG 렌더러 — 흰 스티커 외곽선 + 컬러 패스 + 데코 전용 그림자
const decorSvg = renderDecorSvg(loveDecor);
assert.ok(decorSvg.includes('data-decor="heart"'));
assert.ok(decorSvg.includes('data-slot="crown"'), 'svg marks where each piece sits');
assert.ok(decorSvg.includes(`translate(${hero.x.toFixed(1)} ${hero.y.toFixed(1)})`), 'svg paints the hero at the same canvas spot as the planner');
assert.ok(decorSvg.includes('stroke="#FFFDFA"'), 'decor carries the thick white sticker outline');
assert.ok(decorSvg.includes('opacity="0.16"'), 'decor casts its own soft shadow');
assert.ok(!decorSvg.includes('NaN') && !decorSvg.includes('undefined'));
assert.ok(pathData([['M', 0, 0], ['Q', 1, 2, 3, 4], ['C', 1, 2, 3, 4, 5, 6], ['Z']]).startsWith('M 0.000 0.000 Q 1.000 2.000 3.000 4.000 C 1.000 2.000 3.000 4.000 5.000 6.000 Z'));

// 동전은 밝은 링을 옅은 톤으로 그린다(같은 색으로 칠해지면 그냥 원반이 된다)
const coinSvg = renderDecorSvg(planDecor(decorInput('월급 루팡', 'smug')));
assert.ok(coinSvg.includes('data-decor="coin"'));
assert.ok(/stroke="#[0-9A-F]{6}"/i.test(coinSvg), 'coin ink ring uses a colour');

// 캔버스 렌더러 — 같은 plan 으로 실제 그리기 호출이 늘어난다
calls.length = 0;
drawLayer(fake, normalizeLayer({ text: '사랑해', style: 'calli', x: 0.5, y: 0.86, size: 0.14 }), 360, { emotion: 'love' });
const withDecor = calls.filter((c) => c.op === 'fill' || c.op === 'stroke').length;
assert.ok(withDecor > 10, 'canvas paints the decor cluster (fill/stroke per pass)');
// 데코는 글자 변환 바깥(캔버스 절대 좌표)에서 먼저 그려진다 — 글자 translate 는 그 뒤에 한 번.
const firstRotate = calls.findIndex((c) => c.op === 'rotate');
const firstStrokeText = calls.findIndex((c) => c.op === 'strokeText');
assert.ok(firstRotate >= 0 && firstRotate < firstStrokeText, 'decor is painted before the lettering');
calls.length = 0;
drawLayer(fake, normalizeLayer({ text: '사랑해', style: 'calli', x: 0.5, y: 0.86, size: 0.14, decor: 'off' }), 360, { emotion: 'love' });
const withoutDecor = calls.filter((c) => c.op === 'fill' || c.op === 'stroke').length;
assert.ok(withoutDecor > 0 && withoutDecor < withDecor, 'decor=off keeps the lettering and drops the decor');

// SVG 레이어에도 같은 데코가 붙는다 (미리보기 = 다운로드)
const svgWithDecor = renderSticker(spec({ line: '사랑해', emotion: 'love' }));
assert.ok(svgWithDecor.includes('data-decor="heart"'), 'procedural sticker captions carry the decor too');
assert.ok(planDecorCheck(decorInput('사랑해', 'love')).length === 5, 'short captions get the full five-piece cluster');
assert.equal(decorMotifFor('또 야근이야?', 'angry'), 'angry', 'a chosen emotion beats a bare question mark');
console.log('Context decor: 18 motif variants over 34 icons, ~20% caption volume, head/side/corner composition, face clearance, clamp, on/off and SVG/canvas parity passed');
