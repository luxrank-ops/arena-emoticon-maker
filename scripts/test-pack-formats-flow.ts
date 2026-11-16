// ─────────────────────────────────────────────────────────────
// 표현 형태 팩 생성 파이프라인 통합 점검 (파일 저장소, 외부 호출 없음)
//  · 시트(형태) → 팩(컷 템플릿) → 프레임(레이어·콤보 짝) → 스펙(내보내기 입력)
// 실행: npm run test:pack-flow
// ─────────────────────────────────────────────────────────────
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dataDir = mkdtempSync(join(tmpdir(), 'emotihak-pack-flow-'));
process.env.DATA_DIR = dataDir;
process.env.STORE_BACKEND = 'file';

let passed = 0;
function check(name: string, condition: boolean) {
  assert.ok(condition, name);
  console.log(`  ✔ ${name}`);
  passed++;
}

try {
  const { withDB } = await import('../src/lib/store');
  const { createSheet, chooseSheet, createPack, specFromIdentity, PackError } = await import('../src/lib/packs');
  const { newImageId, saveImage } = await import('../src/lib/images');
  const { DEFAULT_PALETTE, DEFAULT_SIGNATURE } = await import('../src/lib/art/sticker');

  const now = new Date().toISOString();
  await withDB((db) => {
    db.users.push({ id: 'u-flow', name: 'flow', plan: 'FREE', credits: 200, role: 'user', createdAt: now, lastGrantAt: now });
    db.faces.push({
      id: 'face-flow',
      userId: 'u-flow',
      palette: DEFAULT_PALETTE,
      signature: DEFAULT_SIGNATURE,
      metrics: { coverage: 0.5, centering: 0.9, brightness: 0.5, sharpness: 0.9, faceDetected: true },
      consent: { at: now, version: 'v1.2', ip: '0.0.0.0', overseas: true },
      createdAt: now,
      purgedAt: new Date(Date.now() + 86400000).toISOString(),
    });
  });

  const imageId = newImageId();
  await saveImage(imageId, 'u-flow', new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4]));

  async function prepareSheet(format?: string) {
    const sheet = await createSheet('u-flow', 'face-flow', '2d-cute', 'face', 'person', format as never);
    await withDB((db) => {
      const target = db.sheets.find((item) => item.id === sheet.id)!;
      target.variants[0].imageId = imageId;
    });
    await chooseSheet('u-flow', sheet.id, 'A');
    return sheet;
  }

  // ── 표현 형태 팩 (타이포) ───────────────────────────────
  const typoSheet = await prepareSheet('typo');
  check('시트에 표현 형태가 고정된다', typoSheet.format === 'typo' && typoSheet.textMode === 'layer');
  const typoPack = await createPack('u-flow', typoSheet.id, 12, '타이포 테스트', false, undefined, 'ko');
  check('팩에 형태·글자 모드가 기록된다', typoPack.format === 'typo' && typoPack.textMode === 'layer');
  check('12컷 전부 형태 컷 템플릿', typoPack.frames.length === 12 && typoPack.frames.every((f) => f.templateId.startsWith('fmt-typo-')));
  check('컷마다 기본 글자 레이어가 있다', typoPack.frames.every((f) => (f.textLayers?.length ?? 0) === 1));
  check('타이포 첫 컷은 도장 레이어', typoPack.frames[0].textLayers?.[0].style === 'stamp' && typoPack.frames[0].textLayers?.[0].text === typoPack.frames[0].line);
  check('고정 디자인 시트가 팩에 저장된다', !!typoPack.designSheet && typoPack.designSheet.id.startsWith('ds_'));
  const typoSpec = specFromIdentity(typoPack.identity!, typoPack.frames[0]);
  check('내보내기 스펙에 레이어가 실린다', (typoSpec.textLayers?.length ?? 0) === 1 && typoSpec.textLayers![0].style === 'stamp');
  check('레이어 문구는 편집 가능한 한글', /[가-힣]/.test(typoSpec.textLayers![0].text));
  check('크레딧이 컷 수만큼 차감된다', (await withDB((db) => db.users.find((u) => u.id === 'u-flow')!.credits)) === 188);

  // ── 콤보 팩 ────────────────────────────────────────────
  const comboSheet = await prepareSheet('combo');
  const comboPack = await createPack('u-flow', comboSheet.id, 12, '콤보', false, undefined, 'ko');
  const tops = comboPack.frames.filter((f) => f.comboRole === 'top');
  check('콤보는 위/아래 6쌍', tops.length === 6 && comboPack.frames.filter((f) => f.comboRole === 'bottom').length === 6);
  check('콤보 짝 id 가 실제 프레임을 가리킨다', tops.every((top) => !!comboPack.frames.find((f) => f.id === top.comboPairId && f.comboRole === 'bottom')));

  // ── 2인 팩 ─────────────────────────────────────────────
  const duoSheet = await prepareSheet('duo');
  check('2인 시트는 사진 2장 형식으로 표시', duoSheet.format === 'duo');
  const duoPack = await createPack('u-flow', duoSheet.id, 12, '2인', false, undefined, 'ko');
  check('2인 팩 컷 12개 + 형태 유지', duoPack.frames.length === 12 && duoPack.format === 'duo');

  // ── 기존 감정 팩 회귀 ──────────────────────────────────
  const plainSheet = await prepareSheet();
  check('형태 없는 시트는 기존 구성', plainSheet.format === undefined && plainSheet.textMode === undefined);
  const plainPack = await createPack('u-flow', plainSheet.id, 12, '기본', false, undefined, 'ko');
  check('기본 팩은 형태/레이어 없음', plainPack.format === undefined && plainPack.textMode === 'baked' && plainPack.frames.every((f) => !f.textLayers));
  check('기본 팩도 디자인 시트는 가진다', !!plainPack.designSheet);

  // ── 크기 제한 ──────────────────────────────────────────
  const smallSheet = await prepareSheet('typo');
  await assert.rejects(
    () => createPack('u-flow', smallSheet.id, 32, '너무 큼', false, undefined, 'ko'),
    (error: unknown) => error instanceof PackError && error.code === 'INVALID_SIZE',
  );
  check('형태 컷 수를 넘는 팩 크기는 거부', true);

  // ── 소유자 검증 ────────────────────────────────────────
  await assert.rejects(() => createSheet('u-flow', 'face-flow', '2d-cute', 'face', 'person', 'nope' as never), /알 수 없는 표현 형태/);
  check('없는 형태는 거부', true);

  // ── 저장된 팩 조회 ─────────────────────────────────────
  const { getPackView } = await import('../src/lib/packs');
  const view = await getPackView('u-flow', typoPack.id);
  check('팩 조회에 형태·레이어·시트가 그대로', view.pack.format === 'typo' && (view.frames[0].textLayers?.length ?? 0) === 1 && !!view.pack.designSheet);
  check('조회 프레임 스펙에도 레이어', (view.frames[0].spec.textLayers?.length ?? 0) === 1);

  console.log(`\n표현 형태 팩 파이프라인: ${passed}개 통과`);
} finally {
  rmSync(dataDir, { recursive: true, force: true });
}
