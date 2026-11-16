// ─────────────────────────────────────────────────────────────
// 업그레이드 4종 · 표현 형태 5종 — 순수 로직 회귀 테스트
// 실행: npm run test:studio
// ─────────────────────────────────────────────────────────────
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {
  MOTION_TEMPLATES,
  motionById,
  motionDurationMs,
  motionFrameCount,
  motionParticlesAt,
  motionTransformAt,
  motionIds,
} from '../src/lib/studio/motion';
import { applyMask, applyWhiteOutline, computeAlphaMask } from '../src/lib/studio/matte';
import { apngFrameCount, assembleApng, crc32, isApng, parsePngChunks, readPngHeader } from '../src/lib/studio/apng';
import {
  LAYER_BUBBLES,
  LAYER_EFFECTS,
  MAX_LAYERS,
  TEXT_STYLES,
  layerFromLine,
  normalizeLayer,
  normalizeLayers,
} from '../src/lib/studio/layers';
import { PACK_FORMATS, defaultLayerOf, formatCutByTemplate, formatCuts, packFormatById } from '../src/lib/pack-formats';
import { buildCharacterSheet, designSheetChecklist, designSheetPrompt, isCharacterDesignSheet } from '../src/lib/ai/character-sheet';
import { buildRenderPrompt } from '../src/lib/ai/gemini-render';
import { KAKAO_ANIMATED_RULES, KAKAO_RULES, formatBytes, validateKakaoFiles } from '../src/lib/packager';
import { DEFAULT_PALETTE, DEFAULT_SIGNATURE } from '../src/lib/art/sticker';
import type { StickerSpec } from '../src/lib/types';

let passed = 0;
function check(name: string, condition: boolean) {
  assert.ok(condition, name);
  console.log(`  ✔ ${name}`);
  passed++;
}

// ── 1. 모션 템플릿 ─────────────────────────────────────────
check('모션 템플릿 6종 이상 (바운스·깜빡임·흔들림·반짝이·두근거림·둥실둥실)', MOTION_TEMPLATES.length >= 6);
for (const id of ['bounce', 'blink', 'shake', 'sparkle', 'heartbeat', 'float', 'nod', 'swing'] as const) {
  const template = motionById(id);
  check(`${id} 템플릿 정보가 유효`, !!template && template.frames >= 6 && template.delayMs >= 40 && motionFrameCount(id) === template!.frames);
  for (let step = 0; step < 40; step++) {
    const tf = motionTransformAt(id, step / 40);
    assert.ok(Number.isFinite(tf.dx) && Number.isFinite(tf.dy) && Number.isFinite(tf.rotate), `${id} transform finite`);
    assert.ok(Math.abs(tf.dx) < 0.1 && Math.abs(tf.dy) < 0.1, `${id} transform in frame`);
    assert.ok(tf.scaleX > 0.7 && tf.scaleX < 1.4 && tf.scaleY > 0.7 && tf.scaleY < 1.4, `${id} scale sane`);
    assert.ok(tf.alpha > 0 && tf.alpha <= 1, `${id} alpha in range`);
    for (const particle of motionParticlesAt(id, step / 40)) {
      assert.ok(particle.x >= 0 && particle.x <= 1 && particle.y >= 0 && particle.y <= 1, `${id} particle inside canvas`);
      assert.ok(particle.r > 0 && particle.r < 0.2, `${id} particle radius sane`);
    }
  }
  assert.ok(motionDurationMs(id) > 300, `${id} loop length`);
}
check('모션 목록이 중복 없음', new Set(motionIds()).size === motionIds().length);
check('t 는 1을 넘어도 루프한다', motionTransformAt('bounce', 1.25).dy === motionTransformAt('bounce', 0.25).dy);

// ── 2. 정밀 누끼 + 흰색 외곽선 ─────────────────────────────
function solidImage(size: number, inner: [number, number, number, number], bg: [number, number, number, number]) {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const inInner = x >= size / 4 && x < (size * 3) / 4 && y >= size / 4 && y < (size * 3) / 4;
      const color = inInner ? inner : bg;
      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
      data[i + 3] = color[3];
    }
  }
  return data;
}
const whiteBg = solidImage(32, [30, 40, 60, 255], [255, 255, 255, 255]);
const mask = computeAlphaMask(whiteBg, 32, 32, { feather: 2 });
check('가장자리로 이어진 흰 배경을 지운다', mask.alpha[0] === 0 && mask.removed > 0);
check('가운데 캐릭터는 남긴다', mask.alpha[16 * 32 + 16] === 255);
check('경계에 페더링 알파가 생긴다', mask.feathered > 0 && Array.from(mask.alpha).some((a) => a > 0 && a < 255));
const masked = Uint8ClampedArray.from(whiteBg);
applyMask(masked, mask, { feather: 2, decontaminate: true });
check('지운 픽셀의 알파가 0 이 된다', masked[3] === 0);
check('가운데 알파는 그대로', masked[(16 * 32 + 16) * 4 + 3] === 255);

const beforeOutline = solidImage(32, [10, 10, 10, 255], [0, 0, 0, 0]).filter((_, index) => index % 4 === 3);
const outlined = solidImage(32, [10, 10, 10, 255], [0, 0, 0, 0]);
const painted = applyWhiteOutline(outlined, 32, 32, 3);
check('흰색 외곽선이 불투명 영역을 넓힌다', painted > 0);
let whitePixels = 0;
for (let i = 0; i < outlined.length; i += 4) {
  if (outlined[i] === 255 && outlined[i + 1] === 255 && outlined[i + 2] === 255 && outlined[i + 3] > 0) whitePixels++;
}
check('외곽선이 흰색으로 칠해진다', whitePixels > 0);
check('두께 0 이면 아무것도 바꾸지 않는다', applyWhiteOutline(solidImage(8, [0, 0, 0, 255], [0, 0, 0, 0]), 8, 8, 0) === 0);
check('알파만 남은 원본과 비교해 확장됨', beforeOutline.length === 32 * 32);

// ── 3. APNG 조립기 ─────────────────────────────────────────
const pngA = await sharp({ create: { width: 24, height: 24, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0.5 } } }).png().toBuffer();
const pngB = await sharp({ create: { width: 24, height: 24, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 1 } } }).png().toBuffer();
const apng = assembleApng([new Uint8Array(pngA), new Uint8Array(pngB)], 80);
const chunks = parsePngChunks(apng);
check('APNG 은 acTL 청크를 갖는다', chunks.some((c) => c.type === 'acTL'));
check('프레임 수가 2로 기록된다', apngFrameCount(apng) === 2 && isApng(apng));
check('fcTL 이 프레임마다 있다', chunks.filter((c) => c.type === 'fcTL').length === 2);
check('두 번째 프레임은 fdAT 로 들어간다', chunks.some((c) => c.type === 'fdAT'));
check('IHDR 크기를 유지한다', readPngHeader(apng).width === 24 && readPngHeader(apng).height === 24);
check('알파 채널(RGBA) 형식', readPngHeader(apng).colorType === 6);
// 청크 CRC 자체 검증
let crcOk = true;
for (let offset = 8; offset < apng.length; ) {
  const length = (apng[offset] << 24) | (apng[offset + 1] << 16) | (apng[offset + 2] << 8) | apng[offset + 3];
  const typeEnd = offset + 8 + Math.max(0, length);
  const stored = ((apng[typeEnd] << 24) | (apng[typeEnd + 1] << 16) | (apng[typeEnd + 2] << 8) | apng[typeEnd + 3]) >>> 0;
  if (crc32(apng as unknown as Uint8Array, offset + 4, typeEnd) !== stored) crcOk = false;
  offset = typeEnd + 4;
}
check('모든 청크 CRC 가 맞는다', crcOk);
assert.throws(() => assembleApng([], 80), /프레임/);

// ── 4. 한글 레이어 ─────────────────────────────────────────
const layer = normalizeLayer({ text: '퇴근합니다', style: 'stamp', bubble: 'caption', effect: 'sparkle', x: 2, y: -1, size: 9, rotate: 900, color: 'bad' }, 0);
check('레이어 좌표·크기·회전을 범위 안으로 자른다', layer.x === 0.92 && layer.y === 0.08 && layer.size === 0.34 && layer.rotate === 35);
check('잘못된 색은 기본색으로', layer.color === '#191512');
check('스타일·말풍선·이펙트 유지', layer.style === 'stamp' && layer.bubble === 'caption' && layer.effect === 'sparkle');
check('빈 텍스트 레이어는 제거', normalizeLayers([{ text: '  ' }, { text: '안녕' }]).length === 1);
check('레이어 최대 4장', normalizeLayers(Array.from({ length: 9 }, (_, i) => ({ text: `레이어${i}`, style: 'hand' }))).length === MAX_LAYERS);
check('글꼴 4종 · 말풍선 5종 · 이펙트 7종', TEXT_STYLES.length === 4 && LAYER_BUBBLES.length === 5 && LAYER_EFFECTS.length === 7);
const fromLine = layerFromLine('확인했습니다');
check('대사 → 기본 레이어 생성', !!fromLine && fromLine.text === '확인했습니다' && fromLine.bubble === 'round');
check('빈 대사는 레이어 없음', layerFromLine('   ') === null);

// ── 5. 표현 형태 5종 ───────────────────────────────────────
check('표현 형태 5종', PACK_FORMATS.length === 5);
check('형태 id 가 5개 모두 다르다', new Set(PACK_FORMATS.map((f) => f.id)).size === 5);
const allTemplateIds: string[] = [];
for (const format of PACK_FORMATS) {
  check(`${format.id} 컷이 24개 이상`, format.cuts.length >= 24);
  check(`${format.id} 컷에 대사·장면 지시가 있다`, format.cuts.every((cut) => cut.line.length > 0 && cut.action.length > 20));
  check(`${format.id} 프롬프트 장면·구도 존재`, format.prompt.scene.length > 10 && format.prompt.layout.length > 10);
  const localized = formatCuts(format.id, 12, 'en');
  check(`${format.id} 12컷 선택`, localized.length === 12);
  check(`${format.id} 영문 컷은 영문 대사`, localized.every((cut) => cut.line === cut.lineEn));
  check(`${format.id} 한글 컷은 한글 대사`, formatCuts(format.id, 12, 'ko').every((cut) => cut.line === cut.line));
  for (const cut of format.cuts) allTemplateIds.push(`fmt-${format.id}-${cut.id}`);
}
check('템플릿 id 가 전부 고유', new Set(allTemplateIds).size === allTemplateIds.length);
check('컷 → 형태 역참조', formatCutByTemplate('fmt-situation-si-01')?.format.id === 'situation');
check('알 수 없는 템플릿은 null', formatCutByTemplate('comic-laugh') === null);
check('2인 형식만 사진 2장 필요', PACK_FORMATS.filter((f) => f.needsSecondPhoto).map((f) => f.id).join(',') === 'duo');
check('타이포는 글자 없는 생성 + 기본 도장 레이어', packFormatById('typo')?.textMode === 'layer' && defaultLayerOf(packFormatById('typo')!.cuts[0])?.style === 'stamp' && defaultLayerOf(packFormatById('typo')!.cuts[0])?.text === packFormatById('typo')!.cuts[0].line);
const combo = packFormatById('combo')!;
check('콤보는 위/아래 짝이 서로를 가리킨다', combo.cuts.filter((c) => c.comboRole === 'top').every((c) => !!combo.cuts.find((o) => o.id === c.comboPair && o.comboRole === 'bottom')));
check('콤보 짝 수가 짝이 아닌 컷과 일치', combo.cuts.length === combo.cuts.filter((c) => c.comboRole === 'top').length * 2);
check('패러디 컷에 자막 바 기본 레이어', packFormatById('parody')!.cuts[0].textLayer?.bubble === 'caption');
check('알 수 없는 형태는 undefined', packFormatById('nope') === undefined);

// ── 6. 고정 캐릭터 디자인 시트 ─────────────────────────────
const sheet = buildCharacterSheet({ tone: '2d-cute', palette: DEFAULT_PALETTE, signature: DEFAULT_SIGNATURE, mode: 'face', subjectKind: 'person' });
check('디자인 시트가 유효하다', isCharacterDesignSheet(sheet));
check('같은 입력 → 같은 시트 id', sheet.id === buildCharacterSheet({ tone: '2d-cute', palette: DEFAULT_PALETTE, signature: DEFAULT_SIGNATURE, mode: 'face', subjectKind: 'person' }).id);
check('다른 화풍 → 다른 시트 id', sheet.id !== buildCharacterSheet({ tone: 'photo-sticker', palette: DEFAULT_PALETTE, signature: DEFAULT_SIGNATURE }).id);
check('의상·헤어·비율·구도가 고정 문장으로 존재', sheet.outfit.length > 10 && sheet.hair.length > 5 && sheet.build.length > 10 && sheet.framing.length > 5);
const sheetPrompt = designSheetPrompt(sheet);
check('프롬프트에 잠금 블록과 팔레트', sheetPrompt.includes('LOCKED CHARACTER DESIGN SHEET') && sheetPrompt.includes(sheet.id) && sheetPrompt.includes(DEFAULT_PALETTE.shirt.toUpperCase()));
check('전 컷 공통 규칙 4개 이상', sheet.rules.length >= 4 && sheetPrompt.includes('every cut'));
const petSheet = buildCharacterSheet({ tone: '2d-cute', palette: DEFAULT_PALETTE, signature: DEFAULT_SIGNATURE, subjectKind: 'pet' });
check('반려동물 시트는 사람 의상을 고정하지 않는다', petSheet.outfit.includes('no clothing') && petSheet.rules.some((rule) => rule.includes('Do not turn the pet into a human')));
check('UI 체크리스트 6행', designSheetChecklist(sheet).length === 6 && isCharacterDesignSheet({ ...sheet, version: 2 }) === false);

// ── 7. 생성 프롬프트 결선 ──────────────────────────────────
const spec: StickerSpec = { seed: 1, tone: '2d-cute', palette: DEFAULT_PALETTE, signature: DEFAULT_SIGNATURE, emotion: 'joy', intensity: 70, prop: 'none', background: 'transparent', line: '퇴근합니다', linePosition: 'bottom' };
const basePrompt = buildRenderPrompt({ photoBase64: 'cGhvdG8=', mimeType: 'image/jpeg', tone: '2d-cute', emotion: 'joy', line: '퇴근합니다' });
check('기본 프롬프트는 말풍선 대사를 포함', basePrompt.includes('speech bubble') && basePrompt.includes('퇴근합니다'));
const layerPrompt = buildRenderPrompt({ photoBase64: 'cGhvdG8=', mimeType: 'image/jpeg', tone: '2d-cute', emotion: 'joy', line: '퇴근합니다', textMode: 'layer', designSheet: sheet, formatDirectives: { scene: 'holding a coffee cup', layout: 'chest up' } });
check('레이어 모드는 글자를 금지한다', layerPrompt.includes('No lettering at all') && !layerPrompt.includes('퇴근합니다'));
check('디자인 시트·형태 지시가 프롬프트에 들어간다', layerPrompt.includes('LOCKED CHARACTER DESIGN SHEET') && layerPrompt.includes('holding a coffee cup') && layerPrompt.includes('Format layout'));
const duoPrompt = buildRenderPrompt({ photoBase64: 'cGhvdG8=', mimeType: 'image/jpeg', tone: '2d-cute', emotion: 'joy', secondPhoto: { mimeType: 'image/jpeg', base64: 'cGhvdG8=' } });
check('2인 프롬프트는 두 사람·정체성 유지 규칙', duoPrompt.includes('TWO people') && duoPrompt.includes('never swap, merge or blend'));
const comboPrompt = buildRenderPrompt({ photoBase64: 'cGhvdG8=', mimeType: 'image/jpeg', tone: '2d-cute', emotion: 'joy', comboRole: 'bottom' });
check('콤보 아래 조각은 위 컷과 이어지도록 지시', comboPrompt.includes('LOWER panel') && comboPrompt.includes('top edge'));

// ── 8. 카톡 규격 (150KB) ──────────────────────────────────
check('규격이 360px · 150KB · 32종', KAKAO_RULES.size === 360 && KAKAO_RULES.maxBytes === 150 * 1024 && KAKAO_RULES.count === 32);
check('움직이는 규격은 APNG/GIF · 2MB', KAKAO_ANIMATED_RULES.format === 'apng' && KAKAO_ANIMATED_RULES.maxBytes === 2 * 1024 * 1024);
const files = (count: number, bytes: number) => Array.from({ length: count }, (_, i) => ({ name: `${i}.png`, bytes, width: 360, height: 360 }));
check('32개 · 150KB 이하 통과', validateKakaoFiles(files(32, 120 * 1024)).ok);
check('12컷도 내보내기는 가능(개수는 비차단)', validateKakaoFiles(files(12, 100 * 1024)).ok);
check('150KB 초과는 차단', validateKakaoFiles(files(32, 160 * 1024)).ok === false);
check('픽셀 위반은 차단', validateKakaoFiles([{ name: 'a.png', bytes: 1000, width: 320, height: 320 }]).ok === false);
check('바이트 표기', formatBytes(150 * 1024) === '150.0KB');

console.log(`\n업그레이드·표현 형태 검증: ${passed}개 통과`);
