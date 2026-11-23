// ─────────────────────────────────────────────────────────────
// AI 피사체 누끼 — 순수 로직 회귀 테스트
// 실행: npm run test:ai-matte
//  · 브라우저(MediaPipe) 없이 결정 로직·마스크 후처리만 검증한다.
//  · 모델 자체는 실기기 브라우저 검증으로 확인한다(docs/UPGRADE-2026-11-23-ai-matte.md).
// ─────────────────────────────────────────────────────────────
import assert from 'node:assert/strict';
import {
  AI_MAX_SUBJECT_COVERAGE,
  AI_MIN_SUBJECT_COVERAGE,
  accumulateClassConfidence,
  alphaFromClassConfidence,
  alphaFromConfidence,
  applyAlphaToPixels,
  blur3,
  cleanAlpha,
  isPlausibleSubject,
  planMatteEngine,
  resampleAlpha,
  subjectCoverage,
} from '../src/lib/studio/ai-matte-core';
import { computeAlphaMask } from '../src/lib/studio/matte';

let passed = 0;
function check(name: string, condition: boolean) {
  assert.ok(condition, name);
  passed++;
  console.log(`ok  ${name}`);
}

// ── 1. 엔진 선택 (스마트 하이브리드) ───────────────────────
{
  const complex = planMatteEngine({ backgroundColor: null, removedRatio: 0 });
  check('외곽에서 배경색을 못 찾으면 AI 누끼', complex.engine === 'ai' && complex.reason === 'complex-background');

  const solid = planMatteEngine({ backgroundColor: [255, 255, 255], removedRatio: 0.62 });
  check('단색 배경은 색상 기반 고속 경로', solid.engine === 'color' && solid.reason === 'single-color');

  const underflow = planMatteEngine({ backgroundColor: [240, 235, 228], removedRatio: 0.01 });
  check('배경색은 찾았지만 거의 못 지웠으면 AI 누끼', underflow.engine === 'ai' && underflow.reason === 'color-underflow');

  const overflow = planMatteEngine({ backgroundColor: [250, 250, 250], removedRatio: 0.97 });
  check('화면을 거의 다 지웠으면 AI 누끼로 재시도', overflow.engine === 'ai' && overflow.reason === 'color-overflow');

  const boundary = planMatteEngine({ backgroundColor: [250, 250, 250], removedRatio: 0.03 });
  check('경계값(3%)은 색상 기반 유지', boundary.engine === 'color');

  const nan = planMatteEngine({ backgroundColor: [250, 250, 250], removedRatio: Number.NaN });
  check('비정상 비율은 AI 누끼로 안전하게', nan.engine === 'ai');
}

// ── 2. 확신도 → 알파 ───────────────────────────────────────
{
  const conf = new Float32Array([0, 0.1, 0.3, 0.5, 0.7, 0.9, 1]);
  const alpha = alphaFromConfidence(conf, 0.3, 0.7);
  check('확신도 0.3 이하는 완전 투명', alpha[0] === 0 && alpha[1] === 0 && alpha[2] === 0);
  check('확신도 0.7 이상은 완전 불투명', alpha[4] === 255 && alpha[5] === 255 && alpha[6] === 255);
  check('중간 확신도는 반투명 경계', alpha[3] > 100 && alpha[3] < 155);
  check('알파는 단조 증가', alpha[0] <= alpha[1] && alpha[1] <= alpha[2] && alpha[2] <= alpha[3] && alpha[3] <= alpha[4]);

  const out = new Uint8Array(conf.length);
  const reused = alphaFromConfidence(conf, 0.3, 0.7, out);
  check('넘겨받은 알파 배열을 재사용한다', reused === out && out[6] === 255);
}

// ── 3. 다중 클래스 확신도 합치기 ───────────────────────────
{
  const size = 4;
  const sum = new Float32Array(size);
  accumulateClassConfidence(sum, new Float32Array([0.8, 0.1, 0, 0.05]));
  accumulateClassConfidence(sum, new Float32Array([0.1, 0.6, 0, 0.05]));
  check('선택한 클래스 확신도를 누적한다', Math.abs(sum[0] - 0.9) < 1e-6 && Math.abs(sum[1] - 0.7) < 1e-6);
  const alpha = alphaFromClassConfidence(sum, 0.25, 0.65);
  check('누적 확신도가 높으면 불투명', alpha[0] === 255 && alpha[1] === 255);
  check('누적 확신도가 0 이면 투명', alpha[2] === 0);
}

// ── 4. 잔점 정리 (연결 요소) ───────────────────────────────
{
  const width = 40;
  const height = 40;
  const alpha = new Uint8Array(width * height);
  // 큰 덩어리 20×20 (좌상단)
  for (let y = 5; y < 25; y++) for (let x = 5; x < 25; x++) alpha[y * width + x] = 255;
  // 잔점 2×2 (우하단)
  for (let y = 34; y < 36; y++) for (let x = 34; x < 36; x++) alpha[y * width + x] = 255;
  const cleaned = cleanAlpha(alpha, width, height, { smoothPasses: 0, floor: 0 });
  check('잔점 1개를 걷어내고 큰 덩어리만 남긴다', cleaned.dropped === 1 && cleaned.kept === 1);
  check('잔점 픽셀은 투명해진다', cleaned.alpha[34 * width + 34] === 0);
  check('큰 덩어리는 그대로', cleaned.alpha[10 * width + 10] === 255);
  const expected = (20 * 20) / (width * height);
  check('피사체 비율을 계산한다', Math.abs(cleaned.coverage - expected) < 0.002);

  const empty = cleanAlpha(new Uint8Array(16), 4, 4, { smoothPasses: 0 });
  check('빈 마스크는 비율 0', empty.coverage === 0 && empty.kept === 0);

  // 덩어리가 전부 잔점 수준이면 원본을 유지한다(상위에서 폴백 판단)
  const specks = new Uint8Array(width * height);
  for (let i = 0; i < 6; i++) specks[i * 7] = 255;
  const keptAll = cleanAlpha(specks, width, height, { smoothPasses: 0, floor: 0 });
  check('파편뿐인 마스크는 원본 유지', keptAll.alpha.some((value) => value === 255));
}

// ── 5. 스무딩 · 리샘플 · 알파 적용 ─────────────────────────
{
  const width = 8;
  const alpha = new Uint8Array(width * width);
  for (let y = 2; y < 6; y++) for (let x = 2; x < 6; x++) alpha[y * width + x] = 255;
  const blurred = blur3(alpha, width, width);
  check('3×3 스무딩은 경계를 눅인다', blurred[2 * width + 2] < 255 && blurred[2 * width + 2] > 0);

  const small = new Uint8Array([0, 255, 255, 0]);
  const big = resampleAlpha(small, 2, 2, 4, 4);
  check('리샘플은 크기를 맞춘다', big.length === 16);
  check('리샘플 값이 유지된다', big[0] === 0 && big[2] === 255 && big[8] === 255 && big[15] === 0);

  const data = new Uint8ClampedArray(4 * 4);
  for (let i = 0; i < 4; i++) {
    data[i * 4] = 200;
    data[i * 4 + 1] = 120;
    data[i * 4 + 2] = 80;
    data[i * 4 + 3] = 255;
  }
  const mask = new Uint8Array([0, 255, 4, 128]);
  applyAlphaToPixels(data, mask, 2, 8);
  check('배경 픽셀은 투명해진다', data[3] === 0);
  check('피사체 픽셀은 알파 유지', data[7] === 255);
  check('희미한 잔여 알파(4)는 0 으로', data[11] === 0);
  check('반투명 경계는 그대로', data[15] === 128);
  check('색상은 건드리지 않는다', data[0] === 200 && data[1] === 120 && data[2] === 80);
}

// ── 6. 피사체 비율 판정 ────────────────────────────────────
{
  check('2% 미만은 실패로 본다', !isPlausibleSubject(AI_MIN_SUBJECT_COVERAGE / 2));
  check('적당한 비율은 통과', isPlausibleSubject(0.35));
  check('화면을 거의 다 덮으면 실패로 본다', !isPlausibleSubject(AI_MAX_SUBJECT_COVERAGE + 0.01));
  const half = new Uint8Array([255, 255, 0, 0]);
  check('알파에서 피사체 비율을 센다', subjectCoverage(half) === 0.5);
}

// ── 7. 실제 사진 파이프라인 연결 (색상 기반 결과 → 엔진 결정) ──
{
  const size = 64;
  const make = (fill: (x: number, y: number) => [number, number, number]) => {
    const data = new Uint8ClampedArray(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const [r, g, b] = fill(x, y);
        const i = (y * size + x) * 4;
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      }
    }
    return data;
  };

  // (a) 순백 배경 + 가운데 피사체 → 색상 기반 고속 경로
  const plain = make((x, y) => {
    const dx = (x - size / 2) / (size * 0.22);
    const dy = (y - size / 2) / (size * 0.28);
    return dx * dx + dy * dy < 1 ? [190, 140, 110] : [255, 255, 255];
  });
  const plainMask = computeAlphaMask(plain, size, size, { feather: 2 });
  const plainDecision = planMatteEngine({
    backgroundColor: plainMask.backgroundColor,
    removedRatio: plainMask.removed / (size * size),
  });
  check('단색 배경 사진은 색상 기반 경로를 고른다', plainDecision.engine === 'color');
  check('단색 배경은 실제로 배경이 지워진다', plainMask.removed / (size * size) > 0.4);

  // (b) 다색·무늬 배경(집안·공원 실사) + 가운데 피사체 → AI 누끼 경로
  const busy = make((x, y) => {
    const dx = (x - size / 2) / (size * 0.22);
    const dy = (y - size / 2) / (size * 0.28);
    if (dx * dx + dy * dy < 1) return [190, 140, 110];
    const stripe = ((x >> 2) + (y >> 2)) % 2 === 0;
    const wave = Math.round(80 + 70 * Math.sin(x / 3) * Math.cos(y / 4));
    return stripe ? [wave, Math.round(wave * 0.7), 60] : [30, Math.round(wave * 0.5), Math.round(wave * 0.9)];
  });
  const busyMask = computeAlphaMask(busy, size, size, { feather: 2 });
  const busyDecision = planMatteEngine({
    backgroundColor: busyMask.backgroundColor,
    removedRatio: busyMask.removed / (size * size),
  });
  check('무늬 있는 실사 배경은 AI 누끼 경로를 고른다', busyDecision.engine === 'ai');
  check('무늬 배경은 색상 기반으로 배경을 못 지운다', busyMask.removed / (size * size) < 0.2);
}

console.log(`\nAI 누끼 로직 검증: ${passed}개 통과`);
