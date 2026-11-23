'use client';

// ─────────────────────────────────────────────────────────────
// AI 피사체 누끼 (브라우저 전용) — MediaPipe ImageSegmenter
//  · 추가 서버·유료 API 없이 기기 안에서만 돈다(WASM + tflite 모델).
//  · 사람 사진은 초상 누끼 모델(selfie_segmenter, 250KB)로 머리카락 경계까지 잡고,
//    피사체가 거의 안 잡히면(반려동물·사물) 일반 세그멘테이션(deeplab_v3, 2.8MB)으로 한 번 더 시도한다.
//  · 모델 로딩 실패·타임아웃·미지원 브라우저에서는 조용히 null 을 돌려주고,
//    호출부(export.ts)가 기존 색상 기반 누끼로 폴백한다 — 화면이 멈추거나 에러로 막히지 않는다.
// ─────────────────────────────────────────────────────────────

import type { ImageSegmenter } from '@mediapipe/tasks-vision';
import {
  accumulateClassConfidence,
  alphaFromClassConfidence,
  alphaFromConfidence,
  cleanAlpha,
  isPlausibleSubject,
  resampleAlpha,
} from './ai-matte-core';

/** 설치된 @mediapipe/tasks-vision 과 같은 버전의 WASM 을 쓴다 */
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/wasm';
const PERSON_MODEL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite';
const OBJECT_MODEL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/deeplab_v3/float32/1/deeplab_v3.tflite';

/** deeplab_v3(Pascal VOC) 클래스 중 피사체로 볼 것: 새·고양이·소·개·말·사람·양 */
const OBJECT_CLASSES = [3, 8, 10, 12, 13, 15, 17];

const LOAD_TIMEOUT_MS = 20_000;
const SEGMENT_TIMEOUT_MS = 6_000;
const CACHE_LIMIT = 24;

export type AiMatteModel = 'person' | 'objects';

export interface AiMatteResult {
  /** 캔버스 크기에 맞춘 8비트 알파 (0 = 배경, 255 = 피사체) */
  alpha: Uint8Array;
  width: number;
  height: number;
  /** 피사체가 차지하는 비율(0~1) */
  coverage: number;
  model: AiMatteModel;
}

const segmenters = new Map<AiMatteModel, Promise<ImageSegmenter | null>>();
const disabled = new Set<AiMatteModel>();
const cache = new Map<string, AiMatteResult>();

/** 워커·번들에서 SSR 로 평가될 때 브라우저 API 를 건드리지 않는다 */
function hasBrowser(): boolean {
  return typeof document !== 'undefined' && typeof window !== 'undefined';
}

function withTimeout<T>(task: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
    task.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** 모델을 한 번만 만들고 재사용한다. 실패는 세션 동안 기억해 매 컷마다 재시도하지 않는다. */
async function ensureSegmenter(kind: AiMatteModel): Promise<ImageSegmenter | null> {
  if (disabled.has(kind)) return null;
  const existing = segmenters.get(kind);
  if (existing) return await existing;
  const created = (async (): Promise<ImageSegmenter | null> => {
    try {
      const vision = await import('@mediapipe/tasks-vision');
      const fileset = await withTimeout(
        vision.FilesetResolver.forVisionTasks(WASM_URL),
        LOAD_TIMEOUT_MS,
        'mediapipe wasm',
      );
      const segmenter = await withTimeout(
        vision.ImageSegmenter.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: kind === 'person' ? PERSON_MODEL : OBJECT_MODEL },
          runningMode: 'IMAGE',
          outputConfidenceMasks: true,
          outputCategoryMask: false,
        }),
        LOAD_TIMEOUT_MS,
        'mediapipe model',
      );
      return segmenter;
    } catch (error) {
      // 실패한 모델은 세션 동안 끈다 (호출부는 색상 기반 누끼로 계속 동작)
      disabled.add(kind);
      segmenters.delete(kind);
      console.warn('[ai-matte] 모델을 불러오지 못해 색상 기반 누끼로 대체합니다:', kind, error);
      return null;
    }
  })();
  segmenters.set(kind, created);
  return await created;
}

/**
 * 확신도 마스크를 알파로 바꾼다.
 *  · 결과 데이터는 콜백이 끝나면 무효가 되므로 콜백 안에서 전부 복사한다.
 */
function segmentAlpha(
  segmenter: ImageSegmenter,
  source: HTMLCanvasElement,
  kind: AiMatteModel,
): Promise<{ alpha: Uint8Array; width: number; height: number } | null> {
  type RawMask = { alpha: Uint8Array; width: number; height: number };
  return new Promise<RawMask | null>((resolve, reject) => {
    let settled = false;
    try {
      segmenter.segment(source, (result) => {
        try {
          if (settled) return;
          const masks = result.confidenceMasks ?? [];
          const first = masks[0];
          if (!first || !first.hasFloat32Array()) {
            settled = true;
            resolve(null);
            return;
          }
          const width = first.width;
          const height = first.height;
          if (kind === 'person') {
            const alpha = alphaFromConfidence(first.getAsFloat32Array(), 0.3, 0.7);
            settled = true;
            resolve({ alpha, width, height });
            return;
          }
          const sum = new Float32Array(width * height);
          for (const index of OBJECT_CLASSES) {
            const mask = masks[index];
            if (!mask || !mask.hasFloat32Array()) continue;
            accumulateClassConfidence(sum, mask.getAsFloat32Array());
          }
          settled = true;
          resolve({ alpha: alphaFromClassConfidence(sum, 0.22, 0.62), width, height });
        } catch (error) {
          settled = true;
          reject(error);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/** 한 모델로 마스크를 뽑아 캔버스 크기 알파로 정리한다 */
async function runModel(
  canvas: HTMLCanvasElement,
  kind: AiMatteModel,
): Promise<AiMatteResult | null> {
  const segmenter = await ensureSegmenter(kind);
  if (!segmenter) return null;
  let raw: { alpha: Uint8Array; width: number; height: number } | null = null;
  try {
    raw = await withTimeout(segmentAlpha(segmenter, canvas, kind), SEGMENT_TIMEOUT_MS, 'mediapipe segment');
  } catch (error) {
    // 타임아웃·런타임 오류가 반복되면 그 모델은 끈다
    disabled.add(kind);
    segmenters.delete(kind);
    console.warn('[ai-matte] 피사체 인식에 실패해 색상 기반 누끼로 대체합니다:', kind, error);
    return null;
  }
  if (!raw) return null;
  const sized = resampleAlpha(raw.alpha, raw.width, raw.height, canvas.width, canvas.height);
  const cleaned = cleanAlpha(sized, canvas.width, canvas.height, { smoothPasses: 1, floor: 10 });
  if (!isPlausibleSubject(cleaned.coverage)) return null;
  return {
    alpha: cleaned.alpha,
    width: canvas.width,
    height: canvas.height,
    coverage: cleaned.coverage,
    model: kind,
  };
}

/**
 * 복잡한 배경 사진에서 피사체 알파를 뽑는다.
 *  · 사람 누끼 모델을 먼저 쓰고, 피사체가 거의 안 잡히면 일반 모델로 반려동물·사물까지 시도한다.
 *  · 어느 쪽도 쓸 만한 마스크를 못 내면 null — 호출부가 기존 누끼로 폴백한다.
 */
export async function aiSubjectAlpha(
  canvas: HTMLCanvasElement,
  cacheKey?: string,
): Promise<AiMatteResult | null> {
  if (!hasBrowser() || canvas.width === 0 || canvas.height === 0) return null;
  const key = cacheKey ?? `${canvas.width}x${canvas.height}`;
  const cached = cache.get(key);
  if (cached) return cached;

  try {
    let result = await runModel(canvas, 'person');
    // 초상 모델이 피사체를 못 찾았다 → 반려동물·사물일 수 있으니 일반 모델로 한 번 더
    if (!result || result.coverage < 0.05) {
      const objects = await runModel(canvas, 'objects');
      if (objects && (!result || objects.coverage > result.coverage)) result = objects;
    }
    if (!result) return null;
    cache.set(key, result);
    if (cache.size > CACHE_LIMIT) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    return result;
  } catch (error) {
    console.warn('[ai-matte] AI 누끼를 건너뜁니다:', error);
    return null;
  }
}

/** 테스트·디버그용 상태 */
export function aiMatteStatus(): { ready: AiMatteModel[]; disabled: AiMatteModel[]; cached: number } {
  return { ready: [...segmenters.keys()], disabled: [...disabled], cached: cache.size };
}
