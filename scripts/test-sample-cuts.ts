/**
 * 샘플 컷 에셋 검증 — 대사 팩 미리보기가 참조하는 사진 기반 컷이 실제로 존재하는지 확인한다.
 *  · 12감정 모두 컷이 있어야 '감정 바꾸기'가 빈 화면 없이 동작한다.
 *  · 파일이 public/ 아래에 있고, WebP 이고, 앱 번들에 부담 없는 크기인지 본다.
 */
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, '..');
const publicRoot = join(appRoot, 'public');

const { SAMPLE_CUTS } = await import('../src/lib/quote-samples');
const { EMOTIONS } = await import('../src/lib/art/sticker');

const emotions = Object.keys(EMOTIONS) as string[];
assert.equal(emotions.length, 12, '감정 12종이 기준입니다');
for (const emotion of emotions) {
  const src = (SAMPLE_CUTS as Record<string, string | undefined>)[emotion];
  assert.ok(src, `${emotion} 감정의 샘플 컷 경로가 없습니다`);
  assert.ok(src!.startsWith('/samples/quote-photo/'), `${emotion} 샘플 컷은 /samples/quote-photo/ 아래여야 합니다`);
  const file = join(publicRoot, src!.replace(/^\//, ''));
  const stat = statSync(file);
  assert.ok(stat.size > 8_000, `${emotion} 샘플 컷이 너무 작습니다 (${stat.size} bytes)`);
  assert.ok(stat.size < 150_000, `${emotion} 샘플 컷이 너무 큽니다 (${stat.size} bytes)`);
  const head = readFileSync(file).subarray(0, 16);
  assert.equal(head.subarray(0, 4).toString('ascii'), 'RIFF', `${emotion} 샘플 컷이 RIFF 컨테이너가 아닙니다`);
  assert.equal(head.subarray(8, 12).toString('ascii'), 'WEBP', `${emotion} 샘플 컷이 WebP 가 아닙니다`);
}
assert.equal(new Set(Object.values(SAMPLE_CUTS)).size, emotions.length, '감정마다 서로 다른 컷 파일을 써야 합니다');

// 홈·영문 랜딩의 화풍 타일과 원본 사진도 실제 파일이어야 한다.
for (const name of ['original-portrait', 'tone-2d-cute', 'tone-doodle', 'tone-clay-3d', 'tone-3d-cartoon', 'tone-pixel-art', 'tone-watercolor']) {
  const stat = statSync(join(publicRoot, 'samples', `${name}.webp`));
  assert.ok(stat.size > 5_000, `${name}.webp 가 너무 작습니다`);
}


// ── 실사 사진 샘플(/pets · /couple · /team · 홈 · /waitlist) ─────────────
const { PHOTO_SAMPLES, HERO_PHOTO_CUTS, STYLE_TILES, FACE_PHOTO_CUTS } = await import('../src/lib/photo-samples');

function assertPhotoAsset(label: string, src: string) {
  assert.ok(src.startsWith('/samples/photo/'), `${label} 는 /samples/photo/ 아래여야 합니다 (${src})`);
  const file = join(publicRoot, src.replace(/^\//, ''));
  const stat = statSync(file);
  assert.ok(stat.size > 8_000, `${label} 가 너무 작습니다 (${stat.size} bytes)`);
  assert.ok(stat.size < 150_000, `${label} 가 너무 큽니다 (${stat.size} bytes)`);
  const head = readFileSync(file).subarray(0, 16);
  assert.equal(head.subarray(0, 4).toString('ascii'), 'RIFF', `${label} 가 RIFF 컨테이너가 아닙니다`);
  assert.equal(head.subarray(8, 12).toString('ascii'), 'WEBP', `${label} 가 WebP 가 아닙니다`);
}

for (const group of ['pet', 'couple', 'team'] as const) {
  const sample = PHOTO_SAMPLES[group];
  assertPhotoAsset(`${group} 원본`, sample.source.src);
  assert.equal(sample.cuts.length, 3, `${group} 는 실사 컷 3장이 기준입니다`);
  for (const cut of sample.cuts) assertPhotoAsset(`${group} ${cut.line.ko}`, cut.src);
  assert.equal(new Set(sample.cuts.map((c) => c.src)).size, 3, `${group} 컷은 서로 다른 파일이어야 합니다`);
}

// 홈 히어로·화풍 타일도 실사 컷이어야 하고, 실사(사진 그대로)가 맨 앞이어야 한다.
assert.equal(HERO_PHOTO_CUTS.length, 3, '히어로 콜라주는 3장');
for (const cut of HERO_PHOTO_CUTS) assertPhotoAsset(`히어로 ${cut.label.ko}`, cut.src);
assert.equal(STYLE_TILES[0].tone, 'photo-sticker', '화풍 타일 맨 앞은 실사 짤(사진 그대로)이어야 합니다');
assert.ok(STYLE_TILES[0].src.startsWith('/samples/photo/'), '실사 짤 타일은 사진 누끼 컷을 씁니다');

// /waitlist · /quotes 의 얼굴 실사 컷은 기존 12감정 실사 컷을 재사용한다.
for (const cut of FACE_PHOTO_CUTS) {
  assert.ok(cut.src.startsWith('/samples/quote-photo/'), `${cut.src} 는 실사 얼굴 컷이어야 합니다`);
  assert.ok(statSync(join(publicRoot, cut.src.replace(/^\//, ''))).size > 8_000, `${cut.src} 가 너무 작습니다`);
}

console.log('sample-cut tests: 12감정 컷 · 실사 샘플 9컷 · 히어로 3컷 · 화풍 타일 · 원본 사진 에셋 검증 통과');
