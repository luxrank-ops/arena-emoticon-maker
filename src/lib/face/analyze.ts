'use client';

import type { EyeShape, FaceSignature, Jawline, Palette } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
// 온디바이스 셀피 분석 (브라우저 전용)
//  · 사진은 서버로 전송되지 않는다. 피부/헤어 팔레트와 품질 지표만 추출.
//  · MediaPipe FaceLandmarker 를 사용하여 468 얼굴 랜드마크 기반 분석.
//  · MediaPipe 로드 실패 시 기존 색상 기반 분석으로 폴백.
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

// MediaPipe FaceLandmarker 싱글톤 (브라우저에서만 초기화)
let faceLandmarker: any = null;
let landmarkerReady = false;
let landmarkerError: string | null = null;

async function ensureLandmarker(): Promise<boolean> {
  if (landmarkerReady) return true;
  if (landmarkerError) return false;
  try {
    // dynamic import: 브라우저 환경에서만 실행 (SSR 방지)
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task` },
      runningMode: 'IMAGE',
      numFaces: 1,
    });
    landmarkerReady = true;
    return true;
  } catch (e) {
    landmarkerError = e instanceof Error ? e.message : String(e);
    console.warn('[MediaPipe] FaceLandmarker 초기화 실패, 색상 기반 폴백 사용:', landmarkerError);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// 색상 기반 폴백 분석 (기존 로직)
// ─────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function rgb(c: number[]) {
  const h = c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  return `#${h}`;
}

function analyzeByColor(data: Uint8ClampedArray, W: number, H: number): FaceAnalysis {
  const total = W * H;
  const gray = new Float32Array(total);
  let lumaSum = 0;

  const skinXs: number[] = new Array(W).fill(0);
  const skinYs: number[] = new Array(H).fill(0);
  let skinCount = 0;
  let sr = 0;
  let sg = 0;
  let sb = 0;

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
      const zone = Math.min(3, Math.floor((i / W) / H * 4));
      zoneSum[zone] += y;
      zoneCount[zone]++;
    }
  }

  const coverage = skinCount / total;
  const faceDetected = coverage > 0.015;

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

  const zoneAvgs = zoneSum.map((s, z) => (zoneCount[z] > 0 ? s / zoneCount[z] : 128));
  const sortedZones = [...zoneAvgs].sort((a, b) => a - b);
  const skinLuma = sortedZones[1] || sortedZones[0] || 128;
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

  const hairHex = parseInt(palette.hair.slice(1), 16);
  const hairBrightness =
    ((hairHex >> 16) * 0.299 +
      ((hairHex >> 8) & 0xff) * 0.587 +
      (hairHex & 0xff) * 0.114);
  const hairTop = Math.max(0, Math.floor(y0 - H * 0.22));
  const hairRegionHeight = y0 - hairTop;
  const hairToFaceRatio = hairRegionHeight / Math.max(1, y1 - y0);

  let hairStyle: number;
  if (hairBrightness < 70) {
    hairStyle = hairToFaceRatio > 0.45 ? 1 : 0;
  } else if (hairBrightness < 140) {
    hairStyle = 2;
  } else {
    hairStyle = 3;
  }

  const aspect = (x1 - x0) / Math.max(1, y1 - y0);
  const faceForm = clamp((aspect - 0.78) / 0.22, 0, 1);
  const jawline: Jawline = faceForm > 0.6 ? 'round' : faceForm > 0.3 ? 'square' : 'pointed';

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

  const eyeContrast = faceAvgLuma - eyeAvgDark;
  const eyeShape: EyeShape = eyeContrast > 40 ? 'round' : eyeContrast > 20 ? 'almond' : 'narrow';
  const faceWidthPx = x1 - x0;
  const eyeSpacing = clamp(0.8 + (faceWidthPx / W) * 0.6, 0.78, 1.15);
  const eyeSize = clamp(0.82 + eyeContrast * 0.004 + coverage * 0.4, 0.78, 1.15);
  const noseSize = clamp(0.85 + aspect * 0.2 + faceForm * 0.1, 0.8, 1.15);

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
}

function sampleHair(data: Uint8ClampedArray, W: number, H: number, faceTop: number, x0: number, x1: number) {
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
  if (max - min < 14) return '#5AB8F5';
  return rgb(c);
}

// ─────────────────────────────────────────────────────────────
// MediaPipe 랜드마크 → FaceSignature 변환
// ─────────────────────────────────────────────────────────────

function landmarkToSignature(
  landmarks: any[],
  W: number,
  H: number,
  palette: Palette,
  metrics: FaceMetrics,
): FaceSignature {
  // MediaPipe 얼굴 랜드마크 인덱스 (468점)
  // 참고: https://github.com/google/mediapipe/blob/master/mediapipe/modules/face_landmark/data/canonical_face_model_uv_visualization.png
  const L = {
    leftEyeOuter: 33,
    leftEyeInner: 133,
    rightEyeInner: 362,
    rightEyeOuter: 263,
    leftEyeTop: 159,
    leftEyeBottom: 145,
    rightEyeTop: 386,
    rightEyeBottom: 374,
    noseTip: 1,
    noseLeft: 48,
    noseRight: 278,
    mouthTop: 13,
    mouthBottom: 14,
    mouthLeft: 61,
    mouthRight: 291,
    chin: 152,
    leftCheek: 234,
    rightCheek: 454,
    leftEyebrowInner: 70,
    rightEyebrowInner: 300,
    leftEyebrowOuter: 55,
    rightEyebrowOuter: 285,
    foreheadCenter: 10,
    jawLeft: 176,
    jawRight: 399,
  };

  const get = (idx: number) => landmarks[idx];
  const dist = (a: number, b: number) => {
    const pa = get(a);
    const pb = get(b);
    return Math.hypot((pa.x - pb.x) * W, (pa.y - pb.y) * H);
  };
  const norm = (v: number) => clamp(v, 0, 1);

  // 눈 크기: 좌우 눈 세로 길이 평균 / 얼굴 세로 길이
  const faceHeight = dist(L.noseTip, L.chin) * 1.6; // 대략적 얼굴 세로
  const leftEyeH = dist(L.leftEyeTop, L.leftEyeBottom);
  const rightEyeH = dist(L.rightEyeTop, L.rightEyeBottom);
  const eyeSize = norm((leftEyeH + rightEyeH) / 2 / faceHeight * 4);

  // 눈 사이 간격: 양 눈 내측 끝 사이 거리 / 얼굴 가로
  const eyeInnerDist = dist(L.leftEyeInner, L.rightEyeInner);
  const faceWidth = dist(L.jawLeft, L.jawRight);
  const eyeSpacing = norm(eyeInnerDist / faceWidth * 1.6);

  // 눈 모양: 눈 세로/가로 비율
  const leftEyeW = dist(L.leftEyeOuter, L.leftEyeInner);
  const rightEyeW = dist(L.rightEyeInner, L.rightEyeOuter);
  const eyeAspectRatio = ((leftEyeH / Math.max(1, leftEyeW)) + (rightEyeH / Math.max(1, rightEyeW))) / 2;
  const eyeShape: EyeShape = eyeAspectRatio > 0.45 ? 'round' : eyeAspectRatio > 0.28 ? 'almond' : 'narrow';

  // 입 폭: 양 입꼬리 거리 / 얼굴 가로
  const mouthW = dist(L.mouthLeft, L.mouthRight);
  const mouthWidth = norm(mouthW / faceWidth * 1.4);

  // 입술 두께: 입 상하 거리 / 입 폭
  const mouthH = dist(L.mouthTop, L.mouthBottom);
  const lipThickness = norm(mouthH / Math.max(1, mouthW) * 3);

  // 코 크기: 코 너비 / 얼굴 가로
  const noseW = dist(L.noseLeft, L.noseRight);
  const noseSize = norm(noseW / faceWidth * 2.2);

  // 눈썹 두께 대략: 눈썹과 눈 사이 거리 (가까울수록 두꺼운 인상)
  const leftBrowY = get(L.leftEyebrowInner).y;
  const leftEyeY = get(L.leftEyeTop).y;
  const browWeight = norm(1 - Math.abs(leftBrowY - leftEyeY) * 3 + 0.7);

  // 헤어스타일: 이마 높이 (이마가 넓으면 올림머리/묶음머리 추정)
  const foreheadY = get(L.foreheadCenter).y;
  const hairToFaceRatio = (foreheadY * H - 0) / Math.max(1, (get(L.chin).y * H));
  const hairHex = parseInt(palette.hair.slice(1), 16);
  const hairBrightness =
    ((hairHex >> 16) * 0.299 +
      ((hairHex >> 8) & 0xff) * 0.587 +
      (hairHex & 0xff) * 0.114);
  let hairStyle: number;
  if (hairBrightness < 70) {
    hairStyle = hairToFaceRatio > 0.35 ? 1 : 0; // 롱헤어 vs 단발/쇼트
  } else if (hairBrightness < 140) {
    hairStyle = 2;
  } else {
    hairStyle = 3;
  }

  // 턱선 형태: 얼굴 가로세로 비율
  const aspect = faceWidth / Math.max(1, faceHeight);
  const faceForm = clamp((aspect - 0.78) / 0.22, 0, 1);
  const jawline: Jawline = faceForm > 0.6 ? 'round' : faceForm > 0.3 ? 'square' : 'pointed';

  // 안경: 눈 주위 영역이 얼굴 평균보다 유의하게 어두우면 안경으로 간주
  // (랜드마크 기반으로는 안경테 직접 감지가 어려워 색상 기반 보조)
  const glasses = false; // MediaPipe 랜드마크만으로는 안경 감지 한계 → 추후 개선

  return {
    headScale: norm(faceHeight / H * 1.8),
    faceWidth: norm(faceWidth / W * 1.4),
    eyeSpacing,
    eyeSize,
    eyeShape,
    browWeight,
    mouthWidth,
    lipThickness,
    noseSize,
    hairStyle,
    cheek: norm(metrics.coverage * 1.5 + faceForm * 0.2),
    jawline,
    glasses,
  };
}

// ─────────────────────────────────────────────────────────────
// 메인 분석 함수
// ─────────────────────────────────────────────────────────────

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
    if (!ctx) return analyzeByColor(new Uint8ClampedArray(0), W, H);
    ctx.drawImage(bitmap, 0, 0, W, H);
    const { data } = ctx.getImageData(0, 0, W, H);

    // MediaPipe 랜드마크 분석 시도
    if (await ensureLandmarker()) {
      try {
        const results = faceLandmarker.detect(canvas);
        if (results.faceLandmarks && results.faceLandmarks[0]) {
          const landmarks = results.faceLandmarks[0];

          // 피부 팔레트: 이마·양볼·턱 랜드마크 주변 색상 샘플링
          const sampleSkin = (idx: number) => {
            const lm = landmarks[idx];
            const x = Math.round(lm.x * W);
            const y = Math.round(lm.y * H);
            const p = (y * W + x) * 4;
            return [data[p], data[p + 1], data[p + 2]];
          };
          const skinPts = [10, 234, 454, 152].map(sampleSkin); // 이마, 양볼, 턱
          const skinR = Math.round(skinPts.reduce((s, c) => s + c[0], 0) / skinPts.length);
          const skinG = Math.round(skinPts.reduce((s, c) => s + c[1], 0) / skinPts.length);
          const skinB = Math.round(skinPts.reduce((s, c) => s + c[2], 0) / skinPts.length);

          const palette: Palette = {
            skin: rgb([skinR, skinG, skinB]),
            skinShade: rgb([skinR * 0.9, skinG * 0.84, skinB * 0.8]),
            hair: sampleHair(data, W, H, Math.floor(landmarks[10].y * H), 0, W),
            shirt: sampleShirt(data, W, H),
            accent: '#FF6B5B',
          };

          const metrics: FaceMetrics = {
            coverage: 1.0, // 랜드마크가 검출되면 얼굴 있음으로 간주
            centering: clamp(Math.hypot((landmarks[1].x - 0.5) * 2, (landmarks[1].y - 0.48) * 2) * 1.2, 0, 1),
            brightness: data.reduce((s, _, i) => (i % 4 === 0 ? s + data[i] : s), 0) / (W * H),
            sharpness: 0, // MediaPipe 경로에서는 단순화
            faceDetected: true,
          };

          const signature = landmarkToSignature(landmarks, W, H, palette, metrics);

          const issues: FaceIssue[] = [];
          if (metrics.centering > 0.42) issues.push({ code: 'OFF_CENTER', label: '얼굴이 한쪽으로 치우쳤어요', blocking: false });
          if (metrics.brightness < 62) issues.push({ code: 'DARK', label: '사진이 어두워요. 조명을 밝게', blocking: false });
          if (metrics.brightness > 226) issues.push({ code: 'BRIGHT', label: '사진이 너무 밝아요. 역광을 피해주세요', blocking: false });

          return {
            ok: true,
            palette,
            signature,
            metrics,
            issues,
          };
        }
      } catch (e) {
        console.warn('[MediaPipe] 감지 실패, 색상 기반 폴백:', e);
      }
    }

    // 폴백: 색상 기반 분석
    return analyzeByColor(data, W, H);
  } catch {
    return FALLBACK;
  }
}
