// ─────────────────────────────────────────────────────────────
// 고정밀 배경 제거(누끼) + 흰색 스티커 외곽선
//  · 단순 색상 치환 대신, 가장자리에서 이어진 배경만 지우고 경계를 페더링한다.
//  · 지운 경계의 흰색 번짐(halo)을 알파에 맞춰 되돌려(decontamination) 깔끔하게 만든다.
//  · 흰 외곽선은 알파를 바깥으로 확장해 그린다(두께 조절).
//  · 전부 순수 함수라 Node 테스트에서 그대로 검증한다.
// ─────────────────────────────────────────────────────────────

export interface MatteOptions {
  /** 이 밝기 이상이면 배경 후보 (0~255) */
  threshold?: number;
  /** 배경 후보의 채도 허용치 (max-min) */
  saturation?: number;
  /** 경계 부드러움(px) */
  feather?: number;
  /** 가장자리 흰색 번짐 제거 */
  decontaminate?: boolean;
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
}

export const DEFAULT_MATTE: Required<MatteOptions> = {
  threshold: 236,
  saturation: 20,
  feather: 2,
  decontaminate: true,
};

/**
 * 가장자리와 4방향으로 이어진 밝은 무채색 픽셀만 배경으로 판정한다.
 * (눈동자·옷 안쪽의 흰색은 배경과 끊겨 있어 남는다)
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
    return { alpha: new Uint8Array(Math.max(0, total)), removed: 0, feathered: 0, width, height };
  }
  const isBackgroundCandidate = (index: number) => {
    const r = data[index * 4];
    const g = data[index * 4 + 1];
    const b = data[index * 4 + 2];
    const a = data[index * 4 + 3];
    if (a === 0) return true;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return min >= opts.threshold && max - min <= opts.saturation;
  };

  const background = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;
  const push = (index: number) => {
    if (!background[index] && isBackgroundCandidate(index)) {
      background[index] = 1;
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

  // 배경에서 바깥으로 나가는 거리(px, 최대 feather+1)로 경계 알파를 만든다.
  const maxDist = Math.max(1, Math.round(opts.feather));
  const dist = new Uint8Array(total).fill(255);
  let frontier: number[] = [];
  for (let i = 0; i < total; i++) if (background[i]) { dist[i] = 0; frontier.push(i); }
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

  const alpha = new Uint8Array(total).fill(255);
  let removed = 0;
  let feathered = 0;
  for (let i = 0; i < total; i++) {
    if (background[i]) {
      alpha[i] = 0;
      removed++;
      continue;
    }
    if (dist[i] !== 255 && dist[i] <= maxDist) {
      const ratio = Math.min(1, dist[i] / maxDist);
      // 경계 바로 바깥(1px)부터 부드럽게 올라가도록 제곱 커브를 쓴다.
      alpha[i] = Math.round(255 * ratio * ratio);
      if (alpha[i] < 255) feathered++;
    }
  }

  return { alpha, removed, feathered, width, height };
}

/** 알파를 적용하고, 반투명 경계의 흰색 번짐을 되돌린다 (in-place) */
export function applyMask(
  data: Uint8ClampedArray | Uint8Array,
  mask: MatteResult,
  options: MatteOptions = {},
): number {
  const opts = { ...DEFAULT_MATTE, ...options };
  const total = mask.width * mask.height;
  let changed = 0;
  for (let i = 0; i < total; i++) {
    const a = mask.alpha[i];
    if (a === 255) continue;
    data[i * 4 + 3] = a;
    if (a === 0) { changed++; continue; }
    if (opts.decontaminate) {
      // 흰 배경 위에 합성돼 있던 색을 알파로 나눠 원래 색을 복원한다.
      for (let c = 0; c < 3; c++) {
        const value = data[i * 4 + c];
        const restored = Math.round((value - 255 + a) * (255 / a));
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
