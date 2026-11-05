import { tr, type Locale } from '@/lib/i18n/locale';

export interface ClientErrorShape extends Error {
  code?: string;
  status?: number;
}

export function normalizeErrorCode(code?: string | null, status?: number): string {
  if (code === 'TYPE') return 'ERR_IMG_INVALID_FORMAT';
  if (code === 'SIZE') return 'ERR_IMG_TOO_LARGE';
  if (code === 'NO_FACE') return 'ERR_ANALYZE_NO_OBJECT';
  if (code === 'BLUR') return 'ERR_ANALYZE_BLURRY';
  if (code) return code;
  if (status && status >= 500) return 'ERR_SERVER_FAIL';
  return 'ERR_SERVER_FAIL';
}

export function apiResponseError(res: Response, payload: any, fallback: string): ClientErrorShape {
  const error = new Error(payload?.error?.message ?? fallback) as ClientErrorShape;
  error.code = normalizeErrorCode(payload?.error?.code, res.status);
  error.status = res.status;
  return error;
}

export function clientErrorCode(error: unknown): string {
  const shape = error as ClientErrorShape;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'OFFLINE';
  return normalizeErrorCode(shape?.code, shape?.status);
}

export function isRetryableError(error: unknown): boolean {
  const shape = error as ClientErrorShape;
  const code = clientErrorCode(error);
  return code === 'OFFLINE' || (shape?.status ?? 0) >= 500
    || ['ERR_SERVER_FAIL', 'AI_BUSY', 'AI_NOT_CONFIGURED', 'CONSISTENCY_UNAVAILABLE', 'STORE_BUSY'].includes(code);
}

export function clientErrorGuide(code: string, locale: Locale) {
  switch (code) {
    case 'ERR_IMG_MISSING':
      return { message: tr(locale, '분석할 사진을 선택하거나 촬영해 주세요.', 'Choose or take a photo to analyze.'), action: 'upload' as const };
    case 'ERR_IMG_INVALID_FORMAT':
      return { message: tr(locale, 'JPG, PNG, WebP 사진으로 다시 선택해 주세요.', 'Choose a JPG, PNG, or WebP photo.'), action: 'upload' as const };
    case 'ERR_IMG_TOO_LARGE':
      return { message: tr(locale, '사진 데이터가 너무 큽니다. 사진을 줄이거나 다른 사진으로 선택해 주세요.', 'The photo is too large. Reduce it or choose another photo.'), action: 'upload' as const };
    case 'ERR_ANALYZE_NO_OBJECT':
    case 'NO_FACE':
      return { message: tr(locale, '얼굴이 잘 보이지 않습니다. 밝은 곳에서 한 명이 정면을 보게 다시 촬영해 주세요.', 'No clear face was found. Retake one front-facing person in good light.'), action: 'camera' as const };
    case 'ERR_ANALYZE_BLURRY':
    case 'BLUR':
    case 'PHOTO_NEEDS_REVIEW':
      return { message: tr(locale, '사진이 흐리거나 분석하기 어렵습니다. 눈과 얼굴이 선명하게 나오도록 다시 촬영해 주세요.', 'The photo is blurry or hard to analyze. Retake it with sharp eyes and facial features.'), action: 'camera' as const };
    case 'OFFLINE':
      return { message: tr(locale, '오프라인 상태입니다. 사진은 이 탭에 보관되어 있으니 네트워크 연결 후 다시 시도해 주세요.', 'You are offline. Your photo is kept in this tab; reconnect and try again.'), action: 'retry' as const };
    default:
      return { message: tr(locale, '연결이 잠시 불안정합니다. 사진은 이 탭에 보관되어 있으니 잠시 후 다시 시도해 주세요.', 'A temporary connection problem occurred. Your photo is kept in this tab; try again shortly.'), action: 'retry' as const };
  }
}
