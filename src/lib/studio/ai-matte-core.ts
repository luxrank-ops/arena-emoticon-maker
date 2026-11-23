// ─────────────────────────────────────────────────────────────
// AI 피사체 누끼 — 순수 로직 (브라우저/Node 공용, 테스트 대상)
//  · 어떤 엔진으로 누끼를 뗄지 결정한다(단색 배경 = 색상 기반 고속 / 복잡 배경 = AI).
//  · AI 모델이 준 확신도 마스크를 알파로 바꾸고, 잔점·정크 덩어리를 걷어낸다.
//  · MediaPipe 호출은 ai-matte.ts(브라우저 전용)가 맡고, 여기서는 배열 연산만 한다.
// ─────────────────────────────────────────────────────────────

export type MatteEngine = 'color' | 'ai';

export type MatteReason =
  /** 외곽이 단색이라 색상 기반 누끼로 충분하다 */
  | 'single-color'
  /** 외곽에서 배경색을 못 찾았다 — 실사·다색 배경 */
  | 'complex-background'
  /** 배경색은 찾았지만 지워진 영역이 거의 없다 — 실제로는 복잡한 배경 */
  | 'color-underflow'
  /** 색상 기반이 화면을 거의 다 지웠다 — 피사체를 삼켰을 위험 */
  | 'color-overflow'
  /** 사용자가 엔진을 지정했다 */
  | 'forced'
  /** AI 누끼를 시도했으나 마스크를 못 얻어 색상 기반으로 폴백했다 */
  | 'color-fallback';

export interface MatteDecision {
  engine: MatteEngine;
  reason: MatteReason;
}

/** AI 마스크를 받아들일 최소/최대 피사체 면적 비율 */
export const AI_MIN_SUBJECT_COVERAGE = 0.018;
export const AI_MAX_SUBJECT_COVERAGE = 0.985;

/**
 * 누끼 엔진 선택 (스마트 하이브리드)
 *  · 단색·미색 AI 컷은 기존 색상 기반 경로가 더 빠르고 과도한 침식이 없다.
 *  · 외곽이 다색이거나, 색상 기반이 아무것도 못 지웠거나(복잡 배경), 너무 많이 지웠으면(피사체 삼킴)
 *    AI 피사체 누끼를 1차로 쓴다.
 */
export function planMatteEngine(input: {
  backgroundColor: [number, number, number] | null;
  /** 색상 기반 마스크가 지운 픽셀 비율 (0~1) */
  removedRatio: number;
}): MatteDecision {
  const ratio = Number.isFinite(input.removedRatio) ? input.removedRatio : 0;
  if (!input.backgroundColor) return { engine: 'ai', reason: 'complex-background' };
  if (ratio > 0.92) return { engine: 'ai', reason: 'color-overflow' };
  if (ratio < 0.03) return { engine: 'ai', reason: 'color-underflow' };
  return { engine: 'color', reason: 'single-color' };
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/**
 * 확신도(0~1) 마스크 → 8비트 알파.
 *  · low 이하는 완전 투명, high 이상은 완전 불투명, 그 사이는 smoothstep 으로 부드럽게 잇는다.
 *  · 머리카락·털처럼 확신도가 애매한 가장자리가 자연스러운 반투명 경계가 된다.
 */
export function alphaFromConfidence(
  confidence: Float32Array | Uint8Array,
  low = 0.3,
  high = 0.7,
  out?: Uint8Array,
): Uint8Array {
  const alpha = out && out.length === confidence.length ? out : new Uint8Array(confidence.length);
  const span = Math.max(1e-6, high - low);
  for (let i = 0; i < confidence.length; i++) {
    const t = clamp01((confidence[i] - low) / span);
    // smoothstep — 경계에서 기울기가 0 이라 계단이 보이지 않는다
    alpha[i] = Math.round(255 * t * t * (3 - 2 * t));
  }
  return alpha;
}

/**
 * 여러 클래스의 확신도를 하나의 피사체 확신도로 합친다 (세그멘테이션 모델용).
 *  · 클래스 확률은 서로 배타적이라 합이 곧 "이 클래스들일 확률"이 된다.
 *  · 이미 계산된 배열에 누적하도록 out 을 받는다(메모리 절약).
 */
export function accumulateClassConfidence(
  out: Float32Array,
  confidence: Float32Array,
): void {
  const n = Math.min(out.length, confidence.length);
  for (let i = 0; i < n; i++) out[i] += confidence[i];
}

/** 누적 확신도를 0~1 로 자르고(saturate) 알파로 바꾼다 */
export function alphaFromClassConfidence(
  sum: Float32Array,
  low = 0.25,
  high = 0.65,
): Uint8Array {
  const alpha = new Uint8Array(sum.length);
  const span = Math.max(1e-6, high - low);
  for (let i = 0; i < sum.length; i++) {
    const t = clamp01((sum[i] - low) / span);
    alpha[i] = Math.round(255 * t * t * (3 - 2 * t));
  }
  return alpha;
}

/** 알파에서 피사체가 차지하는 비율 (0~1) */
export function subjectCoverage(alpha: Uint8Array, threshold = 128): number {
  if (alpha.length === 0) return 0;
  let count = 0;
  for (let i = 0; i < alpha.length; i++) if (alpha[i] >= threshold) count++;
  return count / alpha.length;
}

/** AI 마스크가 "쓸 만한 피사체"인지 — 너무 작거나 화면을 다 덮으면 실패로 본다 */
export function isPlausibleSubject(coverage: number): boolean {
  return coverage >= AI_MIN_SUBJECT_COVERAGE && coverage <= AI_MAX_SUBJECT_COVERAGE;
}

export interface CleanAlphaOptions {
  /** 전체 대비 남길 최소 덩어리 면적 비율 */
  minAreaRatio?: number;
  /** 가장 큰 덩어리 대비 남길 비율 (두 번째 인물·손 등은 살린다) */
  keepRatioOfLargest?: number;
  /** 알파 스무딩 반복 횟수 (0 = 끔) */
  smoothPasses?: number;
  /** 이 값 미만의 흐릿한 알파는 완전 투명으로 (배경 번짐 제거) */
  floor?: number;
}

export interface CleanAlphaResult {
  alpha: Uint8Array;
  /** 정리 후 피사체 비율 */
  coverage: number;
  /** 걷어낸 잔점 덩어리 수 */
  dropped: number;
  /** 남긴 덩어리 수 */
  kept: number;
}

/**
 * AI 알파 정리
 *  · 배경에 남은 인물 사진·포스터 같은 엉뚱한 덩어리를 걷어낸다(가장 큰 덩어리 기준).
 *  · 256px 모델 출력을 키우며 생긴 계단을 3×3 스무딩으로 눅인다.
 */
export function cleanAlpha(
  input: Uint8Array,
  width: number,
  height: number,
  options: CleanAlphaOptions = {},
): CleanAlphaResult {
  const total = width * height;
  const alpha = new Uint8Array(input);
  if (total <= 0 || alpha.length < total) {
    return { alpha, coverage: 0, dropped: 0, kept: 0 };
  }
  const minAreaRatio = options.minAreaRatio ?? 0.004;
  const keepRatioOfLargest = options.keepRatioOfLargest ?? 0.05;

  // 1) 연결 요소 라벨링 (4방향)
  const labels = new Int32Array(total).fill(-1);
  const queue = new Int32Array(total);
  const pixels = new Int32Array(total);
  const areas: number[] = [];
  const starts: number[] = [];
  let cursor = 0;
  for (let seed = 0; seed < total; seed++) {
    if (labels[seed] !== -1 || alpha[seed] < 128) continue;
    const label = areas.length;
    const start = cursor;
    let head = 0;
    let tail = 0;
    queue[tail++] = seed;
    labels[seed] = label;
    while (head < tail) {
      const index = queue[head++];
      pixels[cursor++] = index;
      const x = index % width;
      const y = (index - x) / width;
      if (x > 0) {
        const n = index - 1;
        if (labels[n] === -1 && alpha[n] >= 128) { labels[n] = label; queue[tail++] = n; }
      }
      if (x < width - 1) {
        const n = index + 1;
        if (labels[n] === -1 && alpha[n] >= 128) { labels[n] = label; queue[tail++] = n; }
      }
      if (y > 0) {
        const n = index - width;
        if (labels[n] === -1 && alpha[n] >= 128) { labels[n] = label; queue[tail++] = n; }
      }
      if (y < height - 1) {
        const n = index + width;
        if (labels[n] === -1 && alpha[n] >= 128) { labels[n] = label; queue[tail++] = n; }
      }
    }
    starts.push(start);
    areas.push(cursor - start);
  }

  // 2) 잔점 제거
  let largest = 0;
  for (const area of areas) if (area > largest) largest = area;
  const minKept = Math.max(total * minAreaRatio, largest * keepRatioOfLargest);
  let dropped = 0;
  let kept = 0;
  for (let label = 0; label < areas.length; label++) {
    if (areas[label] >= minKept) {
      kept++;
      continue;
    }
    dropped++;
    const start = starts[label];
    const end = start + areas[label];
    for (let i = start; i < end; i++) alpha[pixels[i]] = 0;
  }
  if (dropped > 0 && kept === 0) {
    // 전부 걸러졌다면(마스크가 파편뿐) 그대로 둔다 — 상위 로직이 폴백을 판단한다
    alpha.set(input);
    return { alpha, coverage: subjectCoverage(alpha), dropped: 0, kept: areas.length };
  }

  // 3) 가장자리 스무딩
  const smoothPasses = Math.max(0, Math.min(3, options.smoothPasses ?? 1));
  let smoothed = alpha;
  for (let pass = 0; pass < smoothPasses; pass++) smoothed = blur3(smoothed, width, height);

  // 4) 흐릿한 잔여 알파 정리
  const floor = options.floor ?? 10;
  if (floor > 0) {
    for (let i = 0; i < smoothed.length; i++) if (smoothed[i] < floor) smoothed[i] = 0;
  }

  return { alpha: smoothed, coverage: subjectCoverage(smoothed), dropped, kept };
}

/** 3×3 박스 블러 (가장자리는 클램프) — 알파 전용 */
export function blur3(alpha: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(alpha.length);
  for (let y = 0; y < height; y++) {
    const y0 = y > 0 ? y - 1 : y;
    const y1 = y < height - 1 ? y + 1 : y;
    for (let x = 0; x < width; x++) {
      const x0 = x > 0 ? x - 1 : x;
      const x1 = x < width - 1 ? x + 1 : x;
      let sum = 0;
      for (let yy = y0; yy <= y1; yy++) {
        const row = yy * width;
        for (let xx = x0; xx <= x1; xx++) sum += alpha[row + xx];
      }
      const count = (y1 - y0 + 1) * (x1 - x0 + 1);
      out[y * width + x] = Math.round(sum / count);
    }
  }
  return out;
}

/**
 * 마스크 해상도가 캔버스와 다를 때 최근접 보간으로 맞춘다.
 * (MediaPipe 는 보통 입력 크기로 돌려주지만, 모델·버전에 따라 다를 수 있어 방어한다)
 */
export function resampleAlpha(
  alpha: Uint8Array,
  fromWidth: number,
  fromHeight: number,
  toWidth: number,
  toHeight: number,
): Uint8Array {
  if (fromWidth === toWidth && fromHeight === toHeight) return alpha;
  const out = new Uint8Array(toWidth * toHeight);
  for (let y = 0; y < toHeight; y++) {
    const sy = Math.min(fromHeight - 1, Math.floor((y * fromHeight) / toHeight));
    for (let x = 0; x < toWidth; x++) {
      const sx = Math.min(fromWidth - 1, Math.floor((x * fromWidth) / toWidth));
      out[y * toWidth + x] = alpha[sy * fromWidth + sx];
    }
  }
  return out;
}

/**
 * RGBA 픽셀에 알파 마스크를 적용한다 (in-place).
 *  · 원본 알파가 이미 투명한 픽셀은 그대로 둔다.
 *  · AI 마스크는 배경색이 여러 가지라 디컨타미네이션(색 되돌리기)은 하지 않는다.
 */
export function applyAlphaToPixels(
  data: Uint8ClampedArray | Uint8Array,
  alpha: Uint8Array,
  size: number,
  floor = 8,
): number {
  const total = Math.min(size * size, alpha.length);
  let changed = 0;
  for (let i = 0; i < total; i++) {
    const next = alpha[i] < floor ? 0 : alpha[i];
    const current = data[i * 4 + 3];
    if (next >= current) continue;
    data[i * 4 + 3] = next;
    changed++;
  }
  return changed;
}
