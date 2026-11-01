'use client';

import type { FaceSignature, Palette } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
// 온디바이스 셀피 분석 (브라우저 전용)
//  · 사진은 서버로 전송되지 않는다. 피부/헤어 팔레트와 품질 지표만 추출.
//  · 프로덕션에서는 MediaPipe FaceLandmarker 로 대체되며, 반환 계약은 동일하다.
// ─────────────────────────────────────────────────────────────

export interface FaceMetrics {
  coverage: number;
  centering: number;
  brightness: number;
  sharpness: number;
  faceDetected: boolean;
}

export interface FaceIssue {
  code: string;
  label: string;
  blocking: boolean;
}

export interface FaceAnalysis {
  ok: boolean;
  palette: Palette;
  signature: FaceSignature;
  metrics: FaceMetrics;
  issues: FaceIssue[];
}

const FALLBACK: FaceAnalysis = {
  ok: false,
  palette: { skin: '#F6D3B3', skinShade: '#E8BA95', hair: '#332621', shirt: '#5AB8F5', accent: '#FF6B5B' },
  signature: {
    headScale: 1,
    faceWidth: 1,
    eyeSpacing: 1,
    eyeSize: 1,
    browWeight: 1,
    mouthWidth: 1,
    hairStyle: 0,
    cheek: 0.6,
    glasses: false,
  },
  metrics: { coverage: 0, centering: 1, brightness: 0, sharpness: 0, faceDetected: false },
  issues: [{ code: 'NO_IMAGE', label: '이미지를 읽지 못했어요', blocking: true }],
};

export async function analyzeSelfie(file: File): Promise<FaceAnalysis> {
  try {
    if (!file.type.startsWith('image/')) return { ...FALLBACK, issues: [{ code: 'TYPE', label: '이미지 파일만 올릴 수 있어요', blocking: true }] };
    if (file.size > 8 * 1024 * 1024) return { ...FALLBACK, issues: [{ code: 'SIZE', label: '8MB 이하 사진을 사용해 주세요', blocking: true }] };

    const bitmap = await createImageBitmap(file);
    const W = 320;
    const H = Math.max(1, Math.round((bitmap.height / bitmap.width) * W));
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return FALLBACK;
    ctx.drawImage(bitmap, 0, 0, W, H);
    const { data } = ctx.getImageData(0, 0, W, H);

    const total = W * H;
    const skinXs: number[] = new Array(W).fill(0);
    const skinYs: number[] = new Array(H).fill(0);
    let skinCount = 0;
    let sr = 0;
    let sg = 0;
    let sb = 0;
    let lumaSum = 0;

    const gray = new Float32Array(total);
    for (let i = 0, p = 0; i < total; i++, p += 4) {
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      gray[i] = y;
      lumaSum += y;
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
      const isSkin = cb >= 77 && cb <= 130 && cr >= 132 && cr <= 176 && y > 40 && r > 88 && r > g && r > b;
      if (isSkin) {
        skinCount++;
        sr += r;
        sg += g;
        sb += b;
        skinXs[i % W]++;
        skinYs[Math.floor(i / W)]++;
      }
    }

    const coverage = skinCount / total;
    const faceDetected = coverage > 0.015;

    // 신뢰 구간(5~95%)으로 머리카락/배경 오검출 제거
    const bounds = (hist: number[], minCount: number) => {
      const idx: number[] = [];
      hist.forEach((c, i) => {
        if (c >= minCount) idx.push(i);
      });
      if (idx.length === 0) return [0, hist.length - 1] as const;
      const lo = idx[Math.floor(idx.length * 0.04)];
      const hi = idx[Math.floor(idx.length * 0.96)];
      return [lo, hi] as const;
    };
    const [x0, x1] = bounds(skinXs, 1);
    const [y0, y1] = bounds(skinYs, 1);
    const cx = (x0 + x1) / 2 / W;
    const cy = (y0 + y1) / 2 / H;
    const centering = Math.min(1, Math.hypot(cx - 0.5, cy - 0.48) * 2.4);
    const brightness = lumaSum / total;

    // Laplacian variance (선명도)
    let lapSum = 0;
    let lapSum2 = 0;
    let n = 0;
    for (let y = 1; y < H - 1; y += 2) {
      for (let x = 1; x < W - 1; x += 2) {
        const i = y * W + x;
        const v = gray[i - 1] + gray[i + 1] + gray[i - W] + gray[i + W] - 4 * gray[i];
        lapSum += v;
        lapSum2 += v * v;
        n++;
      }
    }
    const lapMean = n ? lapSum / n : 0;
    const sharpness = n ? Math.sqrt(Math.max(0, lapSum2 / n - lapMean * lapMean)) : 0;

    // 팔레트
    const skin = skinCount > 0 ? [sr / skinCount, sg / skinCount, sb / skinCount] : [246, 211, 179];
    const palette: Palette = {
      skin: rgb(skin),
      skinShade: rgb([skin[0] * 0.92, skin[1] * 0.86, skin[2] * 0.82]),
      hair: sampleHair(data, W, H, y0, x0, x1),
      shirt: sampleShirt(data, W, H),
      accent: '#FF6B5B',
    };

    // 헤어 영역의 명도로 스타일 추정 (어두운 머리=단발/쇼트, 밝은 머리=묶음/컬리)
    const hairHex = parseInt(palette.hair.slice(1), 16);
    const hairBrightness =
      ((hairHex >> 16) * 0.299 +
        ((hairHex >> 8) & 0xff) * 0.587 +
        (hairHex & 0xff) * 0.114);
    const hairStyle =
      hairBrightness < 70
        ? coverage > 0.08
          ? 0 // 단발/쇼트 (앞머리만)
          : 1 // 롱헤어 (뒤머리+사이드번)
        : hairBrightness < 140
        ? 2 // 반묶음/올림머리 (상단 번)
        : 3; // 땋은 머리/컬리 (주위 원들)

    // 얼굴 가로세로 비율과 중심 잡음으로 얼굴 형태 보정
    const aspect = (x1 - x0) / Math.max(1, y1 - y0);
    const faceForm = clamp((aspect - 0.78) / 0.22, 0, 1); // 0=긴 얼굴, 1=둥근 얼굴

    // 눈 주변 상대 대비로 안경 대략 감시 (눈 띠 영역이 얼굴 평균보다 유의하게 어두우면 안경으로 간주)
    const eyeBandY = Math.floor((y0 + y1) * 0.42);
    let eyeDarkSum = 0;
    let eyeDarkCount = 0;
    for (let y = Math.max(0, eyeBandY - 2); y < Math.min(H, eyeBandY + 2); y++) {
      for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) {
        const i = (y * W + x) * 4;
        const yy = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        eyeDarkSum += yy;
        eyeDarkCount++;
      }
    }
    const eyeAvgDark = eyeDarkCount ? eyeDarkSum / eyeDarkCount : 128;
    const faceAvgLuma = brightness;
    const glasses = eyeAvgDark < faceAvgLuma * 0.72 && eyeAvgDark < 110;

    const signature: FaceSignature = {
      headScale: clamp(1.0 + (coverage - 0.12) * 0.5 + faceForm * 0.08, 0.92, 1.2),
      faceWidth: clamp(0.88 + aspect * 0.32 + faceForm * 0.1, 0.85, 1.2),
      eyeSpacing: clamp(0.84 + aspect * 0.28 + faceForm * 0.12, 0.8, 1.12),
      eyeSize: clamp(0.86 + coverage * 0.5 + faceForm * 0.1, 0.82, 1.12),
      browWeight: clamp(0.8 + faceForm * 0.3 + (coverage - 0.12) * 0.4, 0.75, 1.15),
      mouthWidth: clamp(0.9 + aspect * 0.2 + faceForm * 0.15, 0.85, 1.18),
      hairStyle,
      cheek: clamp(0.4 + coverage * 1.2 + faceForm * 0.2, 0.35, 0.95),
      glasses,
    };

    const issues: FaceIssue[] = [];
    if (!faceDetected) issues.push({ code: 'NO_FACE', label: '얼굴을 찾지 못했어요. 밝은 곳에서 정면으로 다시 찍어주세요.', blocking: true });
    else {
      if (coverage < 0.03) issues.push({ code: 'FAR', label: '얼굴이 너무 작아요. 조금 더 가까이', blocking: false });
      if (coverage > 0.62) issues.push({ code: 'CLOSE', label: '얼굴이 화면을 꽉 채워요. 살짝 뒤로', blocking: false });
      if (centering > 0.42) issues.push({ code: 'OFF_CENTER', label: '얼굴이 한쪽으로 치우쳤어요', blocking: false });
    }
    if (brightness < 62) issues.push({ code: 'DARK', label: '사진이 어두워요. 조명을 밝게', blocking: false });
    if (brightness > 226) issues.push({ code: 'BRIGHT', label: '사진이 너무 밝아요. 역광을 피해주세요', blocking: false });
    if (sharpness < 9) issues.push({ code: 'BLUR', label: '사진이 흐려요. 카메라를 고정해 주세요', blocking: false });

    return {
      ok: !issues.some((i) => i.blocking),
      palette,
      signature,
      metrics: { coverage, centering, brightness, sharpness, faceDetected },
      issues,
    };
  } catch {
    return FALLBACK;
  }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function rgb(c: number[]) {
  const h = c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  return `#${h}`;
}

function sampleHair(data: Uint8ClampedArray, W: number, H: number, faceTop: number, x0: number, x1: number) {
  const top = Math.max(0, Math.floor(faceTop - H * 0.16));
  const bottom = Math.max(1, Math.floor(faceTop));
  let sum = 0;
  let count = 0;
  const buckets = [0, 0, 0];
  for (let y = top; y < bottom; y++) {
    for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) {
      const p = (y * W + x) * 4;
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      const y2 = 0.299 * r + 0.587 * g + 0.114 * b;
      if (y2 < 150) {
        buckets[0] += r;
        buckets[1] += g;
        buckets[2] += b;
        sum += y2;
        count++;
      }
    }
  }
  if (count < 40) return '#332621';
  return rgb([buckets[0] / count, buckets[1] / count, buckets[2] / count]);
}

function sampleShirt(data: Uint8ClampedArray, W: number, H: number) {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = Math.floor(H * 0.92); y < H; y++) {
    for (let x = Math.floor(W * 0.2); x < W * 0.8; x++) {
      const p = (y * W + x) * 4;
      if (data[p + 3] < 10) continue;
      r += data[p];
      g += data[p + 1];
      b += data[p + 2];
      n++;
    }
  }
  if (!n) return '#5AB8F5';
  const c = [r / n, g / n, b / n];
  const max = Math.max(...c);
  const min = Math.min(...c);
  if (max - min < 14) return '#5AB8F5'; // 무채색 배경이면 기본 셔츠색
  return rgb(c);
}
