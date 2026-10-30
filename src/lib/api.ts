import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { captureError } from '@/lib/observability';

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, ...data }, init);
}

export function fail(code: string, message: string, status = 400) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export function handleError(e: unknown) {
  if (e instanceof ZodError) {
    return fail('INVALID_INPUT', e.issues[0]?.message ?? '입력값을 확인해 주세요', 422);
  }
  const err = e as { code?: string; message?: string };
  if (err?.code && typeof err.code === 'string' && err.code === err.code.toUpperCase()) {
    return fail(err.code, err.message ?? '요청을 처리할 수 없습니다', err.code === 'QUOTA_EXCEEDED' ? 402 : 404);
  }
  void captureError('api', e);
  return fail('INTERNAL', '잠시 후 다시 시도해 주세요', 500);
}
