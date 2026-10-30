import type { ErrorEvent } from '@sentry/nextjs';

// ─────────────────────────────────────────────────────────────
// Sentry 공통 옵션 (서버·엣지·클라이언트 공유)
//  · DSN 이 없으면 SDK 는 enabled:false 로 조용히 비활성 (로컬/CI 안전)
//  · 얼굴 사진·대사·토큰 등 민감정보는 전송 직전에 지운다 (개인정보처리방침 준수)
// ─────────────────────────────────────────────────────────────

export const SENTRY_DSN_SERVER = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
export const SENTRY_DSN_CLIENT = process.env.NEXT_PUBLIC_SENTRY_DSN;
export const SENTRY_ENVIRONMENT =
  process.env.NEXT_PUBLIC_SENTRY_ENV ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV;
export const SENTRY_RELEASE =
  process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA ?? undefined;

/** tracesSampleRate 는 0~1. 기본 5% 로 두어 무료 쿼터를 지킨다. */
export const SENTRY_TRACES_SAMPLE_RATE = clampRate(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE, 0.05);

function clampRate(raw: string | undefined, fallback: number) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1) return fallback;
  return n;
}

const SENSITIVE_KEY = /(cookie|authorization|token|photo|image|palette|address|phone|nickname|prompt|line|text)/i;
const MAX_VALUE_LEN = 120;

/** 이벤트에서 민감 키를 지우고 문자열 길이를 자른다. */
export function scrubValue<T>(input: T): T {
  if (Array.isArray(input)) return input.map((v) => scrubValue(v)) as unknown as T;
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(k)) {
        out[k] = '[filtered]';
        continue;
      }
      out[k] = scrubValue(v);
    }
    return out as T;
  }
  if (typeof input === 'string' && input.length > MAX_VALUE_LEN) return input.slice(0, MAX_VALUE_LEN) as T;
  return input;
}

/** beforeSend 훅: 요청 본문/쿠키/쿼리를 통째로 제거하고 나머지만 정제한다. */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.query_string;
    if (event.request.headers) {
      event.request.headers = scrubValue(event.request.headers) as typeof event.request.headers;
    }
  }
  if (event.extra) event.extra = scrubValue(event.extra);
  if (event.contexts) event.contexts = scrubValue(event.contexts);
  event.user = event.user ? { id: event.user.id } : event.user; // 이메일/IP 등은 남기지 않는다
  return event;
}

/** 공통 init 옵션 (각 런타임 파일에서 spread 해서 사용) */
export function baseSentryOptions(dsn: string | undefined) {
  return {
    dsn,
    enabled: Boolean(dsn),
    environment: SENTRY_ENVIRONMENT,
    release: SENTRY_RELEASE,
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    sendDefaultPii: false,
    beforeSend: scrubEvent,
    ignoreErrors: ['ResizeObserver loop', 'NEXT_NOT_FOUND', 'NEXT_REDIRECT'],
    debug: false,
  };
}
