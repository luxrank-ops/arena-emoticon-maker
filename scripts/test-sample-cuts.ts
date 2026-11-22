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
  assert.ok(src!.startsWith('/samples/cut/'), `${emotion} 샘플 컷은 /samples/cut/ 아래여야 합니다`);
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

console.log('sample-cut tests: 12감정 컷 · 화풍 타일 6종 · 원본 사진 에셋 검증 통과');
