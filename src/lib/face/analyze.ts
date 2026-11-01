'use client';

import type { EyeShape, FaceSignature, Jawline, Palette } from '@/lib/types';

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
    eyeShape: 'almond',
    browWeight: 1,
    mouthWidth: 1,
    lipThickness: 1,
    noseSize: 1,
    hairStyle: 0,
    cheek: 0.6,
    jawline: 'round',
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
    const gray = new Float32Array(total);
    let lumaSum = 0;

    const skinXs: number[] = new Array(W).fill(0);
    const skinYs: number[] = new Array(H).fill(0);
    let skinCount = 0;
    let sr = 0;
    let sg = 0;
    let sb = 0;

    // 다중 영역 피부 샘플링용 버퍼 (이마, 왼쪽볼, 오른쪽볼, 턱)
    const zoneSum = new Array(4).fill(0);
    const zoneCount = new Array(4).fill(0);

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
        // 얼굴 영역 내 세로 위치로 영역 구분 (이마~턱을 4등분)
        const zone = Math.min(3, Math.floor((i / W) / H * 4));
        zoneSum[zone] += y;
        zoneCount[zone]++;
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

    // ── 팔레트: 다중 영역 샘플링 ───────────────────────────
    // 피부: 각 영역 평균의 중앙값에 가까운 가중 평균 (그림자 제외)
    const zoneAvgs = zoneSum.map((s, z) => (zoneCount[z] > 0 ? s / zoneCount[z] : 128));
    const sortedZones = [...zoneAvgs].sort((a, b) => a - b);
    const skinLuma = sortedZones[1] || sortedZones[0] || 128; // 중앙값에 가까운 값
    const skinR = skinCount > 0 ? sr / skinCount : 246;
    const skinG = skinCount > 0 ? sg / skinCount : 211;
    const skinB = skinCount > 0 ? sb / skinCount : 179;

    const palette: Palette = {
      skin: rgb([skinR, skinG, skinB]),
      skinShade: rgb([skinR * 0.9, skinG * 0.84, skinB * 0.8]),
      hair: sampleHair(data, W, H, y0, x0, x1),
      shirt: sampleShirt(data, W, H),
      accent: '#FF6B5B',
    };

    // ── 헤어: 다중 영역 분석 ──────────────────────────────
    const hairHex = parseInt(palette.hair.slice(1), 16);
    const hairBrightness =
      ((hairHex >> 16) * 0.299 +
        ((hairHex >> 8) & 0xff) * 0.587 +
        (hairHex & 0xff) * 0.114);
    // 머리 영역의 세로 비율로 단발/롱헤어 구별
    const hairTop = Math.max(0, Math.floor(y0 - H * 0.2));
    const hairRegionHeight = y0 - hairTop;
    const hairToFaceRatio = hairRegionHeight / Math.max(1, y1 - y0);

    let hairStyle: number;
    if (hairBrightness < 70) {
      // 어두운 머리
      hairStyle = hairToFaceRatio > 0.45 ? 1 : 0; // 롱헤어 vs 단발/쇼트
    } else if (hairBrightness < 140) {
      hairStyle = 2; // 반묶음/올림머리
    } else {
      hairStyle = 3; // 땋은 머리/컬리
    }

    // ── 얼굴 형태 ─────────────────────────────────────────
    const aspect = (x1 - x0) / Math.max(1, y1 - y0);
    const faceForm = clamp((aspect - 0.78) / 0.22, 0, 1); // 0=긴 얼굴, 1=둥근 얼굴
    const jawline: Jawline = faceForm > 0.6 ? 'round' : faceForm > 0.3 ? 'square' : 'pointed';

    // ── 눈 특성 ───────────────────────────────────────────
    const eyeBandY = Math.floor((y0 + y1) * 0.42);
    let eyeDarkSum = 0;
    let eyeDarkCount = 0;
    let eyeLeftDark = 0;
    let eyeRightDark = 0;
    let eyeLeftCount = 0;
    let eyeRightCount = 0;
    for (let y = Math.max(0, eyeBandY - 2); y < Math.min(H, eyeBandY + 2); y++) {
      for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) {
        const i = (y * W + x) * 4;
        const yy = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        eyeDarkSum += yy;
        eyeDarkCount++;
        if (x < cx * W) {
          eyeLeftDark += yy;
          eyeLeftCount++;
        } else {
          eyeRightDark += yy;
          eyeRightCount++;
        }
      }
    }
    const eyeAvgDark = eyeDarkCount ? eyeDarkSum / eyeDarkCount : 128;
    const faceAvgLuma = brightness;
    const glasses = eyeAvgDark < faceAvgLuma * 0.72 && eyeAvgDark < 110;

    // 눈 모양 추정: 눈띠 영역이 상대적으로 어둡고 좁으면 쌍꺼풀/큰눈, 밝고 좁으면 단일/작은눈
    const eyeContrast = faceAvgLuma - eyeAvgDark;
    const eyeShape: EyeShape = eyeContrast > 40 ? 'round' : eyeContrast > 20 ? 'almond' : 'narrow';

    // 눈 사이 간격: 피부 영역 가로 폭 대비 중앙 여백
    const faceWidthPx = x1 - x0;
    const eyeSpacing = clamp(0.8 + (faceWidthPx / W) * 0.6, 0.78, 1.15);

    // 눈 크기: 대비와 커버리지로 추정
    const eyeSize = clamp(0.82 + eyeContrast * 0.004 + coverage * 0.4, 0.78, 1.15);

    // ── 코·입 특성 ────────────────────────────────────────
    // 코 크기: 얼굴 가로 폭과 커버리지로 추정 (아시아 얼굴은 코가 작게 나오는 경향 보정)
    const noseSize = clamp(0.85 + aspect * 0.2 + faceForm * 0.1, 0.8, 1.15);

    // 입술 두께: 입 영역(얼굴 하단 25%)의 명도 대비
    const mouthBandY = Math.floor((y0 + y1) * 0.78);
    let mouthDarkSum = 0;
    let mouthDarkCount = 0;
    for (let y = Math.max(0, mouthBandY - 3); y < Math.min(H, mouthBandY + 3); y++) {
      for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) {
        const i = (y * W + x) * 4;
        const yy = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        mouthDarkSum += yy;
        mouthDarkCount++;
      }
    }
    const mouthAvgDark = mouthDarkCount ? mouthDarkSum / mouthDarkCount : 128;
    const lipContrast = faceAvgLuma - mouthAvgDark;
    const lipThickness = clamp(0.85 + lipContrast * 0.003, 0.75, 1.2);

    // 입 폭: 얼굴 가로 폭 대비
    const mouthWidth = clamp(0.88 + aspect * 0.22 + faceForm * 0.12, 0.82, 1.18);

    const signature: FaceSignature = {
      headScale: clamp(1.0 + (coverage - 0.12) * 0.5 + faceForm * 0.08, 0.9, 1.2),
      faceWidth: clamp(0.85 + aspect * 0.3 + faceForm * 0.1, 0.82, 1.2),
      eyeSpacing,
      eyeSize,
      eyeShape,
      browWeight: clamp(0.78 + faceForm * 0.28 + (coverage - 0.12) * 0.35, 0.72, 1.15),
      mouthWidth,
      lipThickness,
      noseSize,
      hairStyle,
      cheek: clamp(0.38 + coverage * 1.1 + faceForm * 0.18, 0.32, 0.95),
      jawline,
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
  // 머리 영역: 얼굴 상단 위쪽 20% 부터 얼굴 윗선까지, 얼굴 전체 가로 범위
  const top = Math.max(0, Math.floor(faceTop - H * 0.22));
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
  for (let y = Math.floor(H * 0.9); y < H; y++) {
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
