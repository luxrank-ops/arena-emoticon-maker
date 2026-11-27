// ─────────────────────────────────────────────────────────────
// 표정·포즈·이펙트·대사 프리셋 150종 점검 (외부 호출 없음)
//  · 원본 150건 무결성(누락·중복·빈 값) · 영문 문구 · 감정/이펙트 파생
//  · 카테고리+키워드 검색 · 추천/랜덤 채우기
//  · 프리셋 팩 생성 → 컷 템플릿·글자 레이어 → AI 프롬프트 반영
// 실행: npm run test:presets
// ─────────────────────────────────────────────────────────────
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dataDir = mkdtempSync(join(tmpdir(), 'emotihak-presets-'));
process.env.DATA_DIR = dataDir;
process.env.STORE_BACKEND = 'file';

let passed = 0;
function check(name: string, condition: boolean) {
  assert.ok(condition, name);
  console.log(`  ✔ ${name}`);
  passed++;
}

const EMOTIONS = ['joy', 'laugh', 'love', 'sad', 'angry', 'sulk', 'tired', 'surprised', 'smug', 'cry', 'king', 'blank'];
const EFFECT_KINDS = ['none', 'sweat', 'heart', 'sparkle', 'anger', 'money', 'flame'];

try {
  const data = await import('../src/data/emoticon-presets-150');
  const { PRESET_EN_COPY } = await import('../src/data/emoticon-presets-150-en');
  const { buildPetRenderPrompt, buildRenderPrompt } = await import('../src/lib/ai/gemini-render');
  const { normalizeLayers } = await import('../src/lib/studio/layers');

  // ── 1. 원본 150건 무결성 ───────────────────────────────
  check('원본 150건', data.PRESET_SOURCE.length === 150);
  check('id 1~150 연속·중복 없음', data.PRESET_SOURCE.every((row, index) => row.id === index + 1));
  check('7개 필드 모두 비어 있지 않음', data.PRESET_SOURCE.every((row) =>
    [row.category, row.keyword, row.expression, row.pose, row.effect, row.dialogue].every((value) => typeof value === 'string' && value.trim().length > 0)));
  check('파생 프리셋도 150건', data.EMOTICON_PRESETS_150.length === 150 && data.PRESET_COUNT === 150);
  check('카테고리 20종', data.PRESET_CATEGORIES.length === 20);
  check('카테고리 합계 = 150', data.PRESET_CATEGORIES.reduce((sum, category) => sum + category.count, 0) === 150);
  check('모든 카테고리가 데이터에 존재', data.PRESET_CATEGORIES.every((category) =>
    data.PRESET_SOURCE.filter((row) => row.category === category.label).length === category.count));

  // ── 2. 영문 문구 ──────────────────────────────────────
  const enIds = Object.keys(PRESET_EN_COPY).map(Number).sort((a, b) => a - b);
  check('영문 문구 1~150 전부', enIds.length === 150 && enIds.every((id, index) => id === index + 1));
  check('영문 필드 한글 없음', enIds.every((id) => {
    const copy = PRESET_EN_COPY[id];
    return [copy.keyword, copy.expression, copy.pose, copy.effect, copy.dialogue].every((value) => value.trim().length > 0 && !/[가-힣]/.test(value));
  }));
  check('영문 대사가 비어 있지 않음', data.EMOTICON_PRESETS_150.every((preset) => preset.lineEn.trim().length > 0 && !/[가-힣]/.test(preset.lineEn)));

  // ── 3. 파생 값 ────────────────────────────────────────
  check('감정 축이 12종 안', data.EMOTICON_PRESETS_150.every((preset) => EMOTIONS.includes(preset.emotion)));
  check('레이어 이펙트가 7종 안', data.EMOTICON_PRESETS_150.every((preset) => EFFECT_KINDS.includes(preset.effectKind)));
  check('대사는 원본 첫 문구', data.EMOTICON_PRESETS_150.every((preset) => preset.line === preset.dialogue.split('/')[0]!.trim()));
  check('기본 레터링은 말풍선 없는 캘리그라피', data.presetById(21)!.bubble === 'none' && data.presetById(1)!.bubble === 'none');
  check('기본 글꼴은 동글 손글씨', data.presetById(1)!.style === 'round' && data.presetById(21)!.style === 'round');
  check('원본 문구는 그대로 보존', data.presetById(1)!.keyword === '환호 / 신남' && data.presetById(150)!.dialogue === '이만총총 / 다음에봐!');

  // ── 4. 검색 ──────────────────────────────────────────
  const byKorean = data.searchPresets({ query: '환호' });
  check('한글 키워드 검색', byKorean.some((preset) => preset.id === 1));
  const byEnglish = data.searchPresets({ query: 'cheer' });
  check('영문 키워드 검색', byEnglish.some((preset) => preset.id === 1));
  const byBody = data.searchPresets({ query: '출근' });
  check('표정·포즈 문구로도 검색', byBody.some((preset) => preset.id === 66));
  const meme = data.searchPresets({ category: '병맛·밈·과장액션' });
  check('카테고리 필터 12건', meme.length === 12 && meme.every((preset) => preset.category === '병맛·밈·과장액션'));
  check('카테고리 + 키워드 조합', data.searchPresets({ category: '병맛·밈·과장액션', query: '레이저' }).every((preset) => preset.id === 145));
  check('검색 결과 없음도 안전', data.searchPresets({ query: '존재하지않는키워드' }).length === 0);
  check('전체 검색은 150건', data.searchPresets({}).length === 150);

  // ── 5. 추천·랜덤 ─────────────────────────────────────
  const recommended12 = data.recommendedPresetIds(12);
  check('추천 12개 중복 없음', recommended12.length === 12 && new Set(recommended12).size === 12);
  check('추천은 카테고리를 번갈아 고른다', new Set(recommended12.map((id) => data.presetById(id)!.category)).size >= 10);
  const recommended24 = data.recommendedPresetIds(24);
  check('추천 24개 중복 없음', recommended24.length === 24 && new Set(recommended24).size === 24);
  check('추천은 제외 목록을 지킨다', !data.recommendedPresetIds(12, [1, 2, 3]).some((id) => [1, 2, 3].includes(id)));
  const random = data.randomPresetIds(5, [1, 2, 3]);
  check('랜덤은 제외 목록 밖에서 고른다', random.length === 5 && new Set(random).size === 5 && !random.some((id) => [1, 2, 3].includes(id)));
  check('남은 자리가 없으면 빈 배열', data.randomPresetIds(0).length === 0);

  // ── 6. 글자 레이어 ───────────────────────────────────
  const layer = data.presetTextLayer(data.presetById(11)!, 'ko');
  check('레이어 문구 = 프리셋 대사', layer.text === data.presetCaption(data.presetById(11)!, 'ko'));
  check('레이어 이펙트 = 파생 이펙트', layer.effect === data.presetById(11)!.effectKind);
  check('레이어 값이 정규화 범위 안', normalizeLayers([layer]).length === 1 && layer.x >= 0.08 && layer.x <= 0.92 && layer.y >= 0.08 && layer.y <= 0.94 && layer.size >= 0.05 && layer.size <= 0.34);
  const enLayer = data.presetTextLayer(data.presetById(11)!, 'en');
  check('영문 레이어는 영문 대사', !/[가-힣]/.test(enLayer.text) && enLayer.text === data.presetById(11)!.lineEn);

  // ── 7. AI 프롬프트 반영 ──────────────────────────────
  const preset = data.presetById(21)!; // 극대노 / 폭발
  const prompt = buildRenderPrompt({
    photoBase64: '',
    mimeType: 'image/jpeg',
    tone: '2d-cute',
    emotion: preset.emotion,
    textMode: 'layer',
    preset: data.presetPrompt(preset),
  });
  check('프롬프트에 표정 지시', prompt.includes(preset.en.expression));
  check('프롬프트에 포즈 지시', prompt.includes(preset.en.pose));
  check('프롬프트에 이펙트 지시', prompt.includes(preset.en.effect));
  check('레이어 모드에선 글자 금지', prompt.includes('No lettering at all'));
  const petPrompt = buildPetRenderPrompt({
    photoBase64: '',
    mimeType: 'image/jpeg',
    tone: '2d-cute',
    emotion: preset.emotion,
    subjectKind: 'pet',
    preset: data.presetPrompt(preset),
  });
  check('반려동물 프롬프트도 프리셋 반영', petPrompt.includes(preset.en.pose) && petPrompt.includes('anatomy'));

  // ── 8. 팩 생성 연결 ──────────────────────────────────
  const { withDB } = await import('../src/lib/store');
  const { createSheet, chooseSheet, createPack, composeFrame, PackError, getPackView } = await import('../src/lib/packs');
  const { newImageId, saveImage } = await import('../src/lib/images');
  const { DEFAULT_PALETTE, DEFAULT_SIGNATURE } = await import('../src/lib/art/sticker');

  const now = new Date().toISOString();
  await withDB((db) => {
    db.users.push({ id: 'u-preset', name: 'preset', plan: 'FREE', credits: 200, role: 'user', createdAt: now, lastGrantAt: now });
    db.faces.push({
      id: 'face-preset',
      userId: 'u-preset',
      palette: DEFAULT_PALETTE,
      signature: DEFAULT_SIGNATURE,
      metrics: { coverage: 0.5, centering: 0.9, brightness: 0.5, sharpness: 0.9, faceDetected: true },
      consent: { at: now, version: 'v1.2', ip: '0.0.0.0', overseas: true },
      createdAt: now,
      purgedAt: new Date(Date.now() + 86400000).toISOString(),
    });
  });
  const imageId = newImageId();
  await saveImage(imageId, 'u-preset', new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4]));

  async function prepareSheet(format?: string) {
    const sheet = await createSheet('u-preset', 'face-preset', '2d-cute', 'face', 'person', format as never);
    await withDB((db) => {
      const target = db.sheets.find((item) => item.id === sheet.id)!;
      target.variants[0].imageId = imageId;
    });
    await chooseSheet('u-preset', sheet.id, 'A');
    return sheet;
  }

  const sheet = await prepareSheet();
  const pack = await createPack('u-preset', sheet.id, 12, '프리셋 팩', false, undefined, 'ko', undefined, recommended12);
  check('프리셋 팩은 글자 레이어 모드', pack.textMode === 'layer');
  check('12컷 전부 프리셋 템플릿', pack.frames.length === 12 && pack.frames.every((frame) => frame.templateId.startsWith('preset-')));
  check('컷마다 presetId·키워드·대사 기록', pack.frames.every((frame, index) => {
    const source = data.presetById(recommended12[index]!)!;
    return frame.presetId === source.id && frame.label === source.keyword && frame.line === source.line && frame.emotion === source.emotion;
  }));
  check('컷마다 대사·이펙트 레이어 1장', pack.frames.every((frame) => (frame.textLayers?.length ?? 0) === 1 && frame.textLayers![0].text === frame.line));
  check('레이어 이펙트가 프리셋 효과를 따른다', pack.frames.every((frame) => frame.textLayers![0].effect === data.presetById(frame.presetId!)!.effectKind));
  check('크레딧이 컷 수만큼 차감', (await withDB((db) => db.users.find((u) => u.id === 'u-preset')!.credits)) === 188);

  const view = await getPackView('u-preset', pack.id);
  check('팩 조회에도 프리셋·레이어 유지', view.frames.length === 12 && view.frames.every((frame) => !!frame.presetId && (frame.spec.textLayers?.length ?? 0) === 1));

  // 개별 컷: 프리셋만 바꾸면 대사·표정·레이어도 함께 바뀐다
  const target = pack.frames[0];
  const composed = await composeFrame('u-preset', target.id, { presetId: 145 });
  check('컷 프리셋 변경 시 표정·대사 동기화', composed.presetId === 145 && composed.emotion === 'king' && composed.line === data.presetCaption(data.presetById(145)!, 'ko'));
  check('컷 프리셋 변경 시 레이어도 갱신', (composed.textLayers?.length ?? 0) === 1 && composed.textLayers![0].effect === data.presetById(145)!.effectKind);
  const cleared = await composeFrame('u-preset', target.id, { presetId: null });
  check('프리셋 해제', cleared.presetId === undefined);

  // 잘못된 선택은 거부한다
  await assert.rejects(
    () => createPack('u-preset', sheet.id, 12, '짧음', false, undefined, 'ko', undefined, recommended12.slice(0, 11)),
    (error: unknown) => error instanceof PackError && error.code === 'INVALID_PRESET_SELECTION',
  );
  check('컷 수보다 적은 프리셋은 거부', true);
  await assert.rejects(
    () => createPack('u-preset', sheet.id, 12, '중복', false, undefined, 'ko', undefined, [...recommended12.slice(0, 11), recommended12[0]!]),
    (error: unknown) => error instanceof PackError && error.code === 'INVALID_PRESET_SELECTION',
  );
  check('중복 프리셋은 거부', true);
  await assert.rejects(
    () => createPack('u-preset', sheet.id, 12, '없는 id', false, undefined, 'ko', undefined, [...recommended12.slice(0, 11), 999]),
    (error: unknown) => error instanceof PackError && error.code === 'INVALID_PRESET_SELECTION',
  );
  check('없는 프리셋 id 는 거부', true);
  const formatSheet = await prepareSheet('typo');
  await assert.rejects(
    () => createPack('u-preset', formatSheet.id, 12, '형태+프리셋', false, undefined, 'ko', undefined, recommended12),
    (error: unknown) => error instanceof PackError && error.code === 'INVALID_PRESET_SELECTION',
  );
  check('표현 형태 팩과 프리셋은 함께 쓸 수 없음', true);

  // 영문 팩은 영문 키워드·대사로 만들어진다
  const enPack = await createPack('u-preset', sheet.id, 12, 'EN preset', false, undefined, 'en', undefined, recommended12);
  check('영문 팩 컷은 영문 문구', enPack.frames.every((frame) => !/[가-힣]/.test(frame.label) && !/[가-힣]/.test(frame.line)));

  console.log(`\n표정·포즈 프리셋 150종: ${passed}개 통과`);
} finally {
  rmSync(dataDir, { recursive: true, force: true });
}
