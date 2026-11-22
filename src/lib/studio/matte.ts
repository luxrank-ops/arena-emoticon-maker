// ─────────────────────────────────────────────────────────────
// 고정밀 배경 제거(누끼) + 흰색 스티커 외곽선
//  · 단순 색상 치환 대신, 가장자리에서 이어진 배경만 지우고 경계를 페더링한다.
//  · 배경색은 **모서리·외곽 픽셀에서 자동 샘플링**한다 → 순백이 아니라 옅은 크림/미색/단색으로
//    생성된 AI 컷도 깔끔하게 지워진다(기존에는 밝기 236 이상 무채색만 지웠다).
//  · 지운 경계의 배경색 번짐(halo)을 알파에 맞춰 되돌려(decontamination) 깔끔하게 만든다.
//  · 흰 외곽선은 알파를 바깥으로 확장해 그린다(두께 조절).
//  · 전부 순수 함수라 Node 테스트에서 그대로 검증한다.
// ─────────────────────────────────────────────────────────────

export interface MatteOptions {
  /** 이 밝기 이상이면 배경 후보 (0~255) — 자동 감지가 실패했을 때의 폴백 규칙 */
  threshold?: number;
  /** 배경 후보의 채도 허용치 (max-min) */
  saturation?: number;
  /** 경계 부드러움(px) */
  feather?: number;
  /** 가장자리 배경색 번짐 제거 */
  decontaminate?: boolean;
  /** 자동 배경색 샘플링 끄기(옛 규칙만 쓰기) */
  disableAutoBackground?: boolean;
  /** 자동 감지 배경색 허용 오차(채널 최대 차이, 0~255) */
  tolerance?: number;
}

export interface MatteResult {
  /** 0(완전 투명)~255(원본 유지) */
  alpha: Uint8Array;
  /** 지운 픽셀 수 */
  removed: number;
  /** 페더링된 경계 픽셀 수 */
  feathered: number;
  width: number;
  height: number;
  /** 자동 감지된 배경색 (없으면 null) — 디컨타미네이션에 쓴다 */
  backgroundColor: [number, number, number] | null;
}

export const DEFAULT_MATTE: Required<MatteOptions> = {
  threshold: 236,
  saturation: 20,
  feather: 2,
  decontaminate: true,
  disableAutoBackground: false,
  tolerance: 30,
};

type RGB = [number, number, number];

/**
 * 모서리·외곽 픽셀에서 지배적인 배경색을 샘플링한다.
 *  · 외곽 1px 링을 16단위로 양자화해 히스토그램을 만들고, 가장 많은 묶음의 평균색을 쓴다.
 *  · 그 묶음이 외곽의 30% 미만이면 "단일 배경"이라 보지 않고 null(자동 감지 실패)을 돌려준다.
 *    (사진이 프레임을 꽉 채운 경우처럼 배경이 하나로 정해지지 않는 그림에서 안전하다)
 */
export function sampleBackgroundColor(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): RGB | null {
  const total = width * height;
  if (total <= 0 || data.length < total * 4) return null;
  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>();
  let ring = 0;
  const add = (index: number) => {
    const a = data[index * 4 + 3];
    if (a < 8) return; // 이미 투명한 픽셀은 색 판단에서 뺀다
    const r = data[index * 4];
    const g = data[index * 4 + 1];
    const b = data[index * 4 + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    bucket.count += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
    ring += 1;
  };
  for (let x = 0; x < width; x++) {
    add(x);
    add((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    add(y * width);
    add(y * width + width - 1);
  }
  if (ring === 0) return null;
  let best: { count: number; r: number; g: number; b: number } | null = null;
  for (const bucket of buckets.values()) {
    if (!best || bucket.count > best.count) best = bucket;
  }
  if (!best || best.count / ring < 0.3) return null;
  return [Math.round(best.r / best.count), Math.round(best.g / best.count), Math.round(best.b / best.count)];
}

function distance(r: number, g: number, b: number, color: RGB): number {
  return Math.max(Math.abs(r - color[0]), Math.abs(g - color[1]), Math.abs(b - color[2]));
}

function buildMask(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  tolerance: number,
  background: RGB | null,
  legacy: { threshold: number; saturation: number },
): { alpha: Uint8Array; removed: number } {
  const total = width * height;
  const isBackgroundCandidate = (index: number) => {
    const r = data[index * 4];
    const g = data[index * 4 + 1];
    const b = data[index * 4 + 2];
    const a = data[index * 4 + 3];
    if (a === 0) return true;
    // 1) 자동 감지한 배경색과 가까우면 배경 (크림·미색·단색 배경)
    if (background && distance(r, g, b, background) <= tolerance) return true;
    // 2) 폴백: 밝은 무채색(순백 배경) — 감지가 실패한 그림에서도 흰 배경은 지운다
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return min >= legacy.threshold && max - min <= legacy.saturation;
  };

  // 가장자리에서 4방향으로 이어진 배경만 지운다 (눈동자·치아·흰 옷은 배경과 끊겨 있어 남는다)
  const marked = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;
  const push = (index: number) => {
    if (!marked[index] && isBackgroundCandidate(index)) {
      marked[index] = 1;
      queue[tail++] = index;
    }
  };
  for (let x = 0; x < width; x++) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    push(y * width);
    push(y * width + width - 1);
  }
  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = (index - x) / width;
    if (x > 0) push(index - 1);
    if (x < width - 1) push(index + 1);
    if (y > 0) push(index - width);
    if (y < height - 1) push(index + width);
  }

  const alpha = new Uint8Array(total).fill(255);
  let removed = 0;
  for (let i = 0; i < total; i++) {
    if (marked[i]) {
      alpha[i] = 0;
      removed++;
    }
  }
  return { alpha, removed };
}

/** 지운 배경에 맞닿은 픽셀들을 거리순으로 페더링한다. */
function featherFrom(alpha: Uint8Array, width: number, height: number, maxDist: number): number {
  const total = width * height;
  const dist = new Uint8Array(total).fill(255);
  let frontier: number[] = [];
  for (let i = 0; i < total; i++) if (alpha[i] === 0) { dist[i] = 0; frontier.push(i); }
  for (let d = 1; d <= maxDist && frontier.length > 0; d++) {
    const next: number[] = [];
    for (const index of frontier) {
      const x = index % width;
      const y = (index - x) / width;
      const neighbours = [
        x > 0 ? index - 1 : -1,
        x < width - 1 ? index + 1 : -1,
        y > 0 ? index - width : -1,
        y < height - 1 ? index + width : -1,
      ];
      for (const n of neighbours) {
        if (n < 0 || dist[n] !== 255) continue;
        dist[n] = d;
        next.push(n);
      }
    }
    frontier = next;
  }
  let feathered = 0;
  for (let i = 0; i < total; i++) {
    if (alpha[i] === 0 || dist[i] === 255 || dist[i] > maxDist) continue;
    const ratio = Math.min(1, dist[i] / maxDist);
    // 경계 바로 바깥(1px)부터 부드럽게 올라가도록 제곱 커브를 쓴다.
    alpha[i] = Math.round(255 * ratio * ratio);
    if (alpha[i] < 255) feathered++;
  }
  return feathered;
}

/**
 * 배경을 지운 알파 마스크를 만든다.
 *  · 자동 감지 배경색이 있으면 그 색과 이어진 영역을 지우고, 없으면 밝은 무채색 규칙을 쓴다.
 *  · 너무 많이 지워지는 경우(전체의 92%↑)에는 폴백 규칙 결과와 비교해 덜 지운 쪽을 쓴다
 *    — 배경이 인물을 삼키는 사고를 막는 안전장치.
 */
export function computeAlphaMask(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  options: MatteOptions = {},
): MatteResult {
  const opts = { ...DEFAULT_MATTE, ...options };
  const total = width * height;
  if (total <= 0 || data.length < total * 4) {
    return { alpha: new Uint8Array(Math.max(0, total)), removed: 0, feathered: 0, width, height, backgroundColor: null };
  }
  const sampled = opts.disableAutoBackground ? null : sampleBackgroundColor(data, width, height);
  let background: RGB | null = sampled;
  let mask = buildMask(data, width, height, opts.tolerance, background, opts);
  if (background && mask.removed > total * 0.92) {
    const legacyMask = buildMask(data, width, height, opts.tolerance, null, opts);
    if (legacyMask.removed < mask.removed * 0.9) {
      background = null;
      mask = legacyMask;
    }
  }
  const maxDist = Math.max(1, Math.round(opts.feather));
  const feathered = featherFrom(mask.alpha, width, height, maxDist);
  return { alpha: mask.alpha, removed: mask.removed, feathered, width, height, backgroundColor: background };
}

/** 알파를 적용하고, 반투명 경계의 배경색 번짐을 되돌린다 (in-place) */
export function applyMask(
  data: Uint8ClampedArray | Uint8Array,
  mask: MatteResult,
  options: MatteOptions = {},
): number {
  const opts = { ...DEFAULT_MATTE, ...options };
  const total = mask.width * mask.height;
  const bg = mask.backgroundColor ?? ([255, 255, 255] as RGB);
  let changed = 0;
  for (let i = 0; i < total; i++) {
    const a = mask.alpha[i];
    if (a === 255) continue;
    data[i * 4 + 3] = a;
    if (a === 0) { changed++; continue; }
    if (opts.decontaminate) {
      // 배경 위에 합성돼 있던 색을 알파로 나눠 원래 색을 복원한다.
      const aNorm = a / 255;
      for (let c = 0; c < 3; c++) {
        const value = data[i * 4 + c];
        const restored = Math.round((value - bg[c] * (1 - aNorm)) / aNorm);
        data[i * 4 + c] = Math.max(0, Math.min(255, restored));
      }
    }
    changed++;
  }
  return changed;
}

/**
 * 흰색 스티커 외곽선. 불투명 영역의 알파를 바깥으로 thickness px 확장해 흰색으로 칠한다.
 * 이미 불투명한 픽셀은 건드리지 않는다.
 */
export function applyWhiteOutline(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  thickness: number,
  color: [number, number, number] = [255, 255, 255],
): number {
  const radius = Math.max(0, Math.round(thickness));
  const total = width * height;
  if (radius === 0 || total <= 0 || data.length < total * 4) return 0;

  const solid = new Uint8Array(total);
  for (let i = 0; i < total; i++) if (data[i * 4 + 3] >= 128) solid[i] = 1;

  const dist = new Uint8Array(total).fill(255);
  let frontier: number[] = [];
  for (let i = 0; i < total; i++) if (solid[i]) { dist[i] = 0; frontier.push(i); }
  for (let d = 1; d <= radius && frontier.length > 0; d++) {
    const next: number[] = [];
    for (const index of frontier) {
      const x = index % width;
      const y = (index - x) / width;
      const neighbours = [
        x > 0 ? index - 1 : -1,
        x < width - 1 ? index + 1 : -1,
        y > 0 ? index - width : -1,
        y < height - 1 ? index + width : -1,
      ];
      for (const n of neighbours) {
        if (n < 0 || dist[n] !== 255) continue;
        dist[n] = d;
        next.push(n);
      }
    }
    frontier = next;
  }

  let painted = 0;
  for (let i = 0; i < total; i++) {
    if (solid[i] || dist[i] === 255 || dist[i] > radius) continue;
    const ring = 1 - (dist[i] - 1) / radius; // 바깥으로 갈수록 옅게
    const alpha = Math.round(255 * Math.min(1, 0.35 + ring * 0.65));
    if (data[i * 4 + 3] > alpha) continue;
    data[i * 4] = color[0];
    data[i * 4 + 1] = color[1];
    data[i * 4 + 2] = color[2];
    data[i * 4 + 3] = alpha;
    painted++;
  }
  return painted;
}

/**
 * 알파 채널만 남은 마스크로 흰 실루엣 캔버스를 그릴 때 쓰는 도우미.
 * (외곽선을 그림 뒤에 깔면 캐릭터 가장자리가 흰 테두리로 감싸진다)
 */
export function outlineSilhouette(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  thickness: number,
): Uint8ClampedArray {
  const copy = new Uint8ClampedArray(data.length);
  copy.set(data as unknown as ArrayLike<number>);
  for (let i = 0; i < width * height; i++) {
    copy[i * 4] = 255;
    copy[i * 4 + 1] = 255;
    copy[i * 4 + 2] = 255;
  }
  applyWhiteOutline(copy as unknown as Uint8ClampedArray, width, height, thickness);
  return copy;
}
