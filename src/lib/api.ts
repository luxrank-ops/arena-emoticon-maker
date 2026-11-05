import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { captureError } from '@/lib/observability';

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, ...data }, init);
}

export function fail(code: string, message: string, status = 400) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export function photoInputError(e: unknown) {
  if (!(e instanceof ZodError)) return null;
  const issue = e.issues.find((item) => item.path[0] === 'photo');
  if (!issue) return null;
  if (issue.code === 'too_big') return fail('ERR_IMG_TOO_LARGE', '사진 데이터가 너무 큽니다. 사진을 줄인 뒤 다시 시도해 주세요.', 413);
  if (issue.code === 'invalid_type') return fail('ERR_IMG_MISSING', '분석할 이미지를 첨부해 주세요.', 400);
  return fail('ERR_IMG_INVALID_FORMAT', 'JPG, PNG, WebP 이미지만 업로드할 수 있습니다.', 400);
}

export function handleError(e: unknown) {
  if (e instanceof ZodError) {
    return fail('INVALID_INPUT', e.issues[0]?.message ?? '입력값을 확인해 주세요', 422);
  }
  const err = e as { code?: string; message?: string; retryAfterSec?: number; status?: number };
  // 저장소 경합(재시도 소진) → 클라이언트가 다시 시도할 수 있게 503
  if (err?.code === 'STORE_BUSY') {
    const res = fail('STORE_BUSY', err.message ?? '잠시 후 다시 시도해 주세요', 503);
    res.headers.set('Retry-After', '2');
    return res;
  }
  if (err?.code && typeof err.code === 'string' && err.code === err.code.toUpperCase()) {
    const status = typeof err.status === 'number' && err.status >= 400 && err.status <= 599 ? err.status : err.code === 'QUOTA_EXCEEDED' ? 402 : 404;
    return fail(err.code, err.message ?? '요청을 처리할 수 없습니다', status);
  }
  void captureError('api', e);
  return fail('ERR_SERVER_FAIL', '잠시 후 다시 시도해 주세요', 500);
}
